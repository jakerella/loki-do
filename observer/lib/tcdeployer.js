var _ = require('underscore'),
    Q = require('q'),
    fs = require('fs'),
    glob = require('glob'),
    path = require('path'),
    Motorboat = require('motorboat'),
    nconf = require('nconf'),
    MicroEvent = require('microevent');

require('shelljs/global');

var TCDeployer = function() {
    this.init.apply(this, arguments);
};

_.extend(TCDeployer.prototype, {

    'init': function() {
	    this.trigger('log', 'info', '>>> init');
        this._initMotorboat();
    },

    '_initMotorboat': function() {
	    this.trigger('log', 'info', '>>> _initMotorboat');
        this.motorboat = new Motorboat({
            'client_id': nconf.get('digital_ocean:client_id'),
            'api_key': nconf.get('digital_ocean:api_key'),
            'scripts_path': nconf.get('scripts_path'),
            'ssh_key_id': nconf.get('digital_ocean:ssh_key_id'),
            'public_ssh_key': nconf.get('digital_ocean:public_ssh_key'),
            'private_ssh_key': nconf.get('digital_ocean:private_ssh_key')
        });
    },

    /**
     * Called when a project has been successfully built on the TeamCity server.
     *
     * @param {String} dir - Absolute path to a cloned project repo
     * @param {Object} options - Teamcity options object from the project's `package.json` file
     */
    'deploy': function(dir, options) {
	    this.trigger('log', 'info', '>>> deploy');
        var self = this;
        _.defaults(options, {
            'username': null,
            'password': null
        });
        this._createDefaultScripts(dir);
        this._getDroplet(options.subdomain).then(function(droplet) {
            if (droplet) {
                self._updateDroplet(dir, options, droplet).then(function(results) {
                    self.trigger('log', 'info', 'Droplet updated', {
                        'dir': dir,
                        'options': options,
                        'results': results
                    });
                    self._restartApp(droplet.id);
                }, function(err) {
                    self.trigger('log', 'info', 'Error updating existing droplet: ' + err, {
                        'dir': dir,
                        'options': options,
                        'results': results
                    });
                });
            } else {
                self._createDroplet(dir, options).then(function(results) {
                    self.trigger('log', 'info', 'Droplet created', {
                        'dir': dir,
                        'options': options,
                        'results': results
                    });
                    self._registerDomain(options, results[0].id).then(function() {
                        self.trigger('log', 'info', 'Successfully registered domain.', {
                            'options': options
                        });
                        self._copyBuild(results[0].id, dir, options).then(function() {
                            self.trigger('log', 'info', 'Successfully copied build.', {
                                'options': options
                            });
                            self._startApp(results[0].id);
                        }, function(err) {
                            self.trigger('log', 'info', 'Failed to copy build: ' + err, {
                                'options': options
                            });
                        });
                    }, function(err) {
                        self.trigger('log', 'info', 'Failed to register domain: ' + err);
                    });
                }, function(err) {
                    self.trigger('log', 'info', 'Error creating new droplet: ' + err, {
                        'dir': dir,
                        'options': options,
                        'results': results
                    });
                });
            }
        }, function(err) {
            self.trigger('log', 'info', 'Error retrieving droplet info: ' + err, {
                'dir': dir,
                'options': options
            });
        });
    },

    /**
     * Adds `start.sh` and `stop.sh` scripts to the project, if they don't already exist.
     *
     * @private
     */
    '_createDefaultScripts': function(dir) {
	    this.trigger('log', 'info', '>>> _createDefaultScripts');
        exec('touch ' + dir + '/start.sh');
        exec('touch ' + dir + '/stop.sh');
    },

    '_getDroplet': function(name) {
	    this.trigger('log', 'info', '>>> _getDroplet');
        name = name + '.' + nconf.get('hostname');
        var d = Q.defer();
	    var self = this;
        this.motorboat.getDropletByName(name, function(err, droplet) {
            if (err) {
	            self.trigger('log', 'error', err.toString());
                return d.reject(err);
            }
            d.resolve(droplet);
        });
        return d.promise;
    },

    '_updateDroplet': function(dir, options, droplet) {
	    this.trigger('log', 'info', '>>> _updateDroplet');
        var d = Q.defer(),
            self = this;
        this.trigger('log', 'info', 'Updating existing droplet', {
            'dir': dir,
            'options': options,
            'droplet': droplet
        });
        this._syncBuild(droplet.id, dir).then(function() {
            d.resolve();
        }, function(err) {
            d.reject(err);
        });
        return d.promise;
    },

    '_createDroplet': function(dir, options) {
	    this.trigger('log', 'info', '>>> _createDroplet');
        var d = Q.defer();
        this.trigger('log', 'info', 'Creating new droplet', {
            'dir': dir,
            'options': options
        });
        var provisionScript = dir + '/provision.sh',
            buildScript = dir + '/build.sh',
            scripts;
        scripts = glob.sync(nconf.get('scripts_path') + '/*');
        if (fs.existsSync(provisionScript)) {
            scripts.push(provisionScript);
        }
        if (fs.existsSync(buildScript)) {
            scripts.push(buildScript);
        }
	    var self = this;
        this.motorboat.provision({
            'name': options.subdomain + '.' + nconf.get('hostname'),
            'size': '66',
            'image': '4426659',
            'region': '4',
            'private_networking': true,
            'folders': [],
            'scripts': scripts
        }, function(err, results) {
            if (err) {
	            self.trigger('log', 'error', err.toString());
                return d.reject(err);
            }
            d.resolve(results);
        });
        return d.promise;
    },

    '_registerDomain': function(options, box_id) {
	    this.trigger('log', 'info', '>>> _registerDomain');
        var self = this;
        var d = Q.defer();
        var register = function(droplet) {
            self.motorboat.domainRecordNew('328048', 'A', droplet.ip_address, {
                'name': options.subdomain
            }, function(err, result) {
                if (err) {
	                self.trigger('log', 'error', err.toString());
                    return d.reject(err);
                }
                d.resolve();
            });
        };
        this.motorboat.dropletGet(box_id, function(err, droplet) {
            if (err) {
	            self.trigger('log', 'error', err.toString());
                return d.reject(err);
            }
            self.motorboat.domainRecordGetAll('328048', function(err, results) {
                if (err) {
	                self.trigger('log', 'error', err.toString());
                    return d.reject(err);
                }
                var record = _.findWhere(results, {
                    'data': droplet.private_ip_address
                });
                if (record) {
                    self.motorboat.domainRecordDestroy('328048', record.id, function(err) {
                        if (err) {
	                        self.trigger('log', 'error', err.toString());
                            return d.reject(err);
                        }
                        register(droplet);
                    });
                } else {
                    register(droplet);
                }
            });
        });
        return d.promise;
    },

    '_copyBuild': function(box_id, dir, options) {
	    this.trigger('log', 'info', '>>> _copyBuild');
        var self = this,
            d = Q.defer(),
            attempts = 0;
        var kopy = function() {
            attempts++;
            self.motorboat.copyFolder(box_id, dir, '/opt', function(err) {
                if (err) {
	                self.trigger('log', 'error', err.toString());
                    if (attempts >= 5) {
                        return d.reject(err);
                    } else {
                        setTimeout(function() {
                            kopy();
                        }, 120000);
                        return;
                    }
                }
                var cmd = 'mv /opt/' + path.basename(dir) + ' /opt/app';
                self.motorboat.runInstanceCommand(box_id, cmd, function(err) {
                    if (err) {
	                    self.trigger('log', 'error', err.toString());
                        return d.reject(err);
                    }
                    return d.resolve();
                });
            });
        };
        kopy();
        return d.promise;
    },

    '_syncBuild': function(box_id, dir) {
	    this.trigger('log', 'info', '>>> _syncBuild');
        var self = this,
            d = Q.defer(),
            attempts = 0;
        var kopy = function() {
            attempts++;
	        self.trigger('log', 'info', 'attempts ' + attempts);
            self.motorboat.copyFolder(box_id, dir + '/', '/opt/app/', function(err) {
                if (err) {
                    self.trigger('log', 'error', 'copyFolder: ' + err.toString());
                    if (attempts >= 5) {
                        return d.reject(err);
                    } else {
						return setTimeout(kopy, 1000 * 60 * 2);
                    }
                }
                return d.resolve();
            });
        };
        kopy();
        return d.promise;
    },

    '_deleteBuild': function(box_id) {
	    this.trigger('log', 'info', '>>> _deleteBuild');
        var d = Q.defer();
        var cmd = 'rm -rf /opt/app';
	    var self = this;
        this.motorboat.runInstanceCommand(box_id, cmd, function(err) {
            if (err) {
	            self.trigger('log', 'error', err.toString());
                return d.reject(err);
            }
            return d.resolve();
        });
        return d.promise;
    },

    '_startApp': function(box_id) {
	    this.trigger('log', 'info', '>>> _startApp');
        var d = Q.defer(),
            self = this;
        var cmd1 = 'cd /opt/app; chmod +x ./provision.sh; ./provision.sh';
        var cmd2 = 'cd /opt/app; chmod +x ./stop.sh; chmod +x ./start.sh; ./stop.sh; ./start.sh > /dev/null &';
        console.log('...', cmd1, cmd2);
        self.trigger('log', 'info', 'Starting app(1)', {
            'cmd1': cmd1,
            'cmd2': cmd2
        });
        this.motorboat.runInstanceCommand(box_id, cmd1, function(err, result) {
            self.trigger('log', 'result(1): ' + result);
            self.trigger('log', 'info', 'Starting app(2): ' + cmd2);
            self.motorboat.runInstanceCommand(box_id, cmd2, function(err, result) {
                self.trigger('log', 'result(2): ' + result);
                return d.resolve();
            });
        });
        return d.promise;
    },

    '_restartApp': function(box_id) {
	    this.trigger('log', 'info', '>>> _restartApp');
        var d = Q.defer(),
            self = this;
        var cmd1 = 'cd /opt/app; chmod +x ./update.sh; ./update.sh';
        var cmd2 = 'cd /opt/app; chmod +x ./stop.sh; chmod +x ./start.sh; ./stop.sh; ./start.sh > /dev/null &';
        this.motorboat.runInstanceCommand(box_id, cmd1, function(err, result) {
	        if (err) {
		        self.trigger('log', 'error', err.toString());
		        return d.reject(err);
	        }
            self.motorboat.runInstanceCommand(box_id, cmd2, function(err, result) {
	            if (err) {
		            self.trigger('log', 'error', err.toString());
		            return d.reject(err);
	            }
                return d.resolve();
            });
        });
        return d.promise;
    }

});

MicroEvent.mixin(TCDeployer);

module.exports = TCDeployer;
