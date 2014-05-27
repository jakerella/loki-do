var Express = require('express'),
    _ = require('underscore'),
    messenger = require('messenger'),
    fs = require('fs'),
    url = require('url'),
    path = require('path'),
    request = require('request'),
    connect = require('connect'),
    async = require('async'),
    bodyParser = require('body-parser'),
    Server;

/**
 * @class Server
 */
Server = function() {
    this.init.apply(this, arguments);
};

_.extend(Server.prototype, /** @lends Server.prototype */ {

    /**
     * @constructor
     */
    'init': function() {
        var self = this;
        this._logFile = '/var/log/teamcity_express.log';
        this._log('Initializing');
        this._servers = {};
        this._primaryExpressPort = 80; // 80 in production
        this._statServerPort = 8080; // 8080 in production
        this._root_domain = 'teamcity.ap2.us'; // teamcity.ap2.us in production
        this._initServer();
        this._initStatServer();
        this._initMessenger();
        this._restore();
        process.on('exit', function() {
            self._log('Shutting down');
            _.each(self._servers, function(server) {
                self._log('Closed server: ' + server['package']);
                server.express.close();
            });
        });
        setInterval(function() {
            self._checkServers();
        }, 5000);
        setInterval(function() {
            self._logServers();
        }, 60000);
    },

    /**
     * Creates the primary Express server that is responsible for delegating incoming
     * requests to virtual hosts that are created for each build.
     *
     * @private
     */
    '_initServer': function() {
        var self = this;
        var launch = function() {
            self._log('Launching primary Express server.');
            if (_.isEmpty(self._servers)) {
                self._log('No virtual hosts are defined.');
                return;
            }
            self._server = Express();
            var data = [];
            _.each(self._servers, function(server) {
                var stat = fs.statSync(server['package']);
                if (!stat.isFile()) {
                    self._log('Virtual host package is not a file: ' + server['package']);
                    return;
                }

                var entry = {
                    'subdomain': server.subdomain,
                    'directories': server.directories
                };
                data.push(entry);

                self._server.use(function(req, res, next) {
                    if (!req.headers || !req.headers.host) {
                        return res.send(401);
                    }
                    var hostname = ( req.headers.host.match(/:/g) ) ? req.headers.host.slice( 0, req.headers.host.indexOf(":") ) : req.headers.host
                    if (!hostname) {
                        return res.send(401);
                    }
                    var tmp = hostname.split('.');
                    var subdomain = tmp.shift();
                    var server = self._getServerBySubdomain(subdomain);
                    if (!server) {
                        return res.send(401);
                    }

                    var username = server.username;
                    var password = server.password;

                    if (username && password) {
                        // self._log('Checking auth for incoming request...');
                        var auth = req.get('authorization');
                        // self._log('auth', auth);
                        if (!auth) {
                            // self._log('Authorization header was not present');
                            res.statusCode = 401;
                            res.setHeader("WWW-Authenticate", "Basic realm=\"Authorization Required\"");
                            res.end("Authorization Required");
                        } else {
                            var credentials = new Buffer(auth.split(" ").pop(), "base64").toString("ascii").split(":");
                            // self._log('Credentials: ', credentials);
                            if (credentials[0] === username && credentials[1] === password) {
                                // self._log('Auth check passed');
                                next();
                            } else {
                                // self._log('Auth check failed');
                                res.status(403).send("Access Denied (incorrect credentials)");
                            }
                        }
                    } else {
                        next();
                    }

                });

                self._server.use(connect.vhost(server.subdomain + '.' + self._root_domain, server.express));

            }, self);
            self._log('Initializing web proxy for servers:', data);
            self._server = self._server.listen(self._primaryExpressPort);
            self._log('Primary Express server is now listening on port: ' + self._primaryExpressPort);
            self._backup();
        };
        if (this._server) {
            this._log('Closing existing primary Express server.');
            this._server.on('close', function() {
                self._log('Primary Express server closed.');
                launch();
            });
            this._server._connections = 0;
            this._server.close();
        } else {
            launch();
        }
    },

    /**
     * @private
     */
    '_getServerBySubdomain': function(subdomain) {
        if (!this._servers[subdomain]) {
            return;
        }
        return this._servers[subdomain];
    },

    /**
     * Creates a backup file that describes the currently running Express instances. Important
     * for if / when the server ever crashes and needs to be restarted.
     *
     * @private
     */
    '_backup': function() {
        var data = [],
            target = '/tmp/teamcity_express.bak';
        _.each(this._servers, function(server) {
            var row = {
                'package': server['package'],
                'subdomain': server['subdomain']
            };
            data.push(row);
        });
        fs.writeFile(target, JSON.stringify(data), function(err) {
        });
    },

    /**
     * Restores the server using data saved by the `_backup` method.
     *
     * @private
     */
    '_restore': function() {
        var source = '/tmp/teamcity_express.bak',
            servers = [],
            self = this;
        fs.readFile(source, 'utf-8', function(err, data) {
            try {
                servers = JSON.parse(data);
                _.each(servers, function(server) {
                    self._incomingProject(null, {
                        'project_path': server['package'],
                        'subdomain': server['subdomain']
                    });
                });
            } catch(e) {
            }
        });
    },

    /**
     * @private
     */
    '_initMessenger': function() {
        this._log('Initializing messenger service');
        this._messengerServer = messenger.createListener('127.0.0.1:20001');
        _.each(this._listenForEvents, function(fnName, key) {
            this._messengerServer.on(key, this[fnName].bind(this));
        }, this);
    },

    /**
     * @private
     */
    '_listenForEvents': {
        'load_project': '_incomingProject'
    },

    /**
     * @private
     */
    '_incomingProject': function(message, data) {
        var self = this,
            packagePath;
        if (message) {
            message.reply({
                'status': 'received'
            });
        }
        self._log('Incoming project request', data);
        if (!_.isObject(data)) {
            self._log('Invalid project data received.');
            return;
        }
        var projectPath = data.project_path;
        if (!projectPath) {
            self._log('Project path was not defined.');
            return;
        }
        if (projectPath.indexOf('package.json') >= 0) {
            projectPath = path.dirname(projectPath);
        }
        fs.exists(projectPath, function(exists) {
            if (!exists) {
                self._log('Project path does not exist.');
                return;
            }
            fs.lstat(projectPath, function(err, stats) {
                if (err || !stats.isDirectory()) {
                    return;
                }
                packagePath = projectPath + '/package.json';
                fs.exists(packagePath, function(exists) {
                    if (!exists) {
                        return;
                    }
                    fs.lstat(packagePath, function(err, stats) {
                        if (err || !stats.isFile()) {
                            return;
                        }
                        self._loadProject(packagePath, data.subdomain);
                    });
                });
            });
        });
    },

    /**
     * When a project is successfully built by TeamCity, a message is sent to this server,
     * which ends up getting routed here.
     *
     * @private
     * @param {String} packagePath - The absolute path to a checked out repo.
     * @param {String} subdomain - The subdomain at which the project should be made accessible.
     */
    '_loadProject': function(packagePath, subdomain) {
        var self = this;
        self._log('Loading project `' + packagePath + '` on subdomain: ' + subdomain);
        fs.readFile(packagePath, 'utf8', function(err, data) {
            if (err) {
                return;
            }
            try {
                data = JSON.parse(data);
            } catch(e) {
                data = null;
            }
            if (!data) {
                return;
            }
            if (!_.isObject(data.teamcity) || _.isEmpty(data.teamcity)) {
                return;
            }
            if (!_.isObject(data.teamcity.directories) || _.isEmpty(data.teamcity.directories)) {
                return;
            }
            var series = [];
            _.each(data.teamcity.directories, function(v, k) {
                data.teamcity.directories[k] = path.resolve(path.dirname(packagePath) + '/' + v);
                series.push(function(callback) {
                    if (!data.teamcity.directories[k]) {
                        return callback('Invalid directory: ' + data.teamcity.directories[k]);
                    }
                    fs.exists(data.teamcity.directories[k], function(exists) {
                        if (!exists) {
                            return callback('Invalid directory: ' + data.teamcity.directories[k]);
                        }
                        fs.lstat(data.teamcity.directories[k], function(err, stats) {
                            if (err || !stats.isDirectory()) {
                                return callback('Invalid directory: ' + data.teamcity.directories[k]);
                            }
                            return callback(null, data.teamcity.directories);
                        });
                    });
                });
            });
            async.series(series, function(err, results) {
                if (err) {
                    return;
                }
                self._loadProjectServer(packagePath, data.teamcity.directories, subdomain, data.teamcity.username || null, data.teamcity.password || null);
            });
        });
    },

    /**
     * This is where the Express instance for each build actually gets created.
     *
     * @private
     */
    '_loadProjectServer': function(packagePath, directories, subdomain, username, password) {
        this._log('Initializing project server', packagePath, directories, subdomain, username, password);
        var self = this;
        var launch = function() {
            self._servers[subdomain] = {
                'package': packagePath,
                'port': self._getRandomPort(),
                'express': Express(),
                'directories': directories,
                'subdomain': subdomain,
                'username': username,
                'password': password
            };
            _.each(directories, function(v, k) {
                self._servers[subdomain].express.use(k, Express.static(v));
            }, self);
            self._servers[subdomain].express = self._servers[subdomain].express.listen(self._servers[subdomain].port);
            self._initServer();
        };
        if (this._servers[subdomain]) {
            this._killServer(subdomain, function() {
                launch();
            });
        } else {
            launch();
        }
    },

    /**
     * Searches for existing Express instances and returns a random port that is not
     * already being used.
     *
     * @private
     */
    '_getRandomPort': function() {
        var min = 80000,
            max = 81000,
            available = false,
            result;
        while (!available) {
            result = Math.floor(Math.random() * (max - min) + min);
            var server = _.find(this._servers, function(server) {
                if (server.port === result) {
                    return true;
                }
            });
            if (!server) {
                available = true;
            }
        }
        return result;
    },

    /**
     * @private
     */
    '_killServer': function(subdomain, fn) {
        this._log('Killing server on subdomain ' + subdomain, this._servers[subdomain]['package']);
        this._servers[subdomain].express.on('close', function() {
            fn();
        });
        this._servers[subdomain].express._connections = 0;
        this._servers[subdomain].express.close();
    },

    /**
     * @private
     */
    '_log': function() {
        var args = _.toArray(arguments),
            enc;
        if (args.length === 1) {
            if (typeof args[0] === 'string') {
                enc = args[0];
            } else {
                enc = JSON.stringify(args[0]);
            }
        } else {
            if (typeof args[0] === 'string') {
                var text = args.shift();
                enc = text + ' -- ' + JSON.stringify(args);
            } else {
                enc = JSON.stringify(args);
            }
        }
        console.log(enc);
        fs.appendFile(this._logFile, enc + "\n", function(err) {
        });
    },

    /**
     * @private
     */
    '_checkServers': function() {
        var self = this,
            closed = 0;
        var initServer = function() {
            self._initServer();
        };
        initServer = _.debounce(initServer, 5000);
        _.each(this._servers, function(server, k) {
            fs.exists(server['package'], function(exists) {
                if (!exists) {
                    closed++;
                    self._log('Killing non-existent project', server['package']);
                    server.express.on('close', function() {
                        self._log('Non-existent project was closed');
                        delete self._servers[k];
                    });
                    server.express._connections = 0;
                    server.express.close();
                }
            });
        }, this);
        if (closed) {
            initServer();
        }
    },

    /**
     * @private
     */
    '_logServers': function() {
        var i = 0;
        for (var k in this._servers) {
            i++;
        }
        this._log(i + ' Express servers are currently running.');
    },

    /**
     * @private
     */
    '_initStatServer': function() {
        this._log('Initializing stat server on port:', this._statServerPort);
        var self = this;
        this._statServer = Express();
        this._statServer.use(bodyParser());
        this._statServer.get('/', function(req, res) {
            var build_id = req.query.build_id,
                project_id = req.query.project_id;
            if (build_id) {
                return self._getBuildStatusBadge(build_id, res);
            } else if (project_id) {
                self._getProjectStatusHTML(project_id, function(err, html) {
                    if (err) {
                        return res.send(500, 'Unknown error.');
                    }
                    res.send(html);
                });
            } else {
                res.send(500, 'No valid build_id or project_id specified.');
            }
        });
        this._statServer.listen(this._statServerPort);
    },

    /**
     * @private
     */
    '_getBuildStatusBadge': function(build_id, res) {
        request('http://localhost:8111/app/rest/builds/buildType:' + build_id + '/statusIcon').pipe(res);
    },

    /**
     * @private
     */
    '_getBuildStatusHTML': function(build_id, fn) {
        request('http://localhost:8111/externalStatus.html?buildTypeId=' + build_id, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                return fn(null, body);
            }
            fn(true);
        });
    },

    /**
     * @private
     */
    '_getProjectStatusHTML': function(project_id, fn) {
        request('http://localhost:8111/externalStatus.html?projectId=' + project_id, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                return fn(null, body);
            }
            fn(true);
        });
    }

});

module.exports = Server;
