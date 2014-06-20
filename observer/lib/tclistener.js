var messenger = require('messenger'),
    fs = require('fs'),
    path = require('path'),
    MicroEvent = require('microevent'),
    _ = require('underscore'),
    Q = require('q');

var TCListener = function() {
    this.init.apply(this, arguments);
};

_.extend(TCListener.prototype, {

    'init': function() {
        this._initMessenger();
    },

    '_initMessenger': function() {
        var self = this;
        this._messenger = messenger.createListener('127.0.0.1:20001');
        this._messenger.on('deploy', function(message, data) {
            self._deploy(message, data);
        });
    },

    /**
     * Called when a successful deploy occurs on the TeamCity server.
     */
    '_deploy': function(message, data) {
        var packagePath,
            projectDir,
            subdomain,
            self = this;
        if (!message) {
            return;
        }
        data = data || {};
        message.reply({
            'status': 'received'
        });
        _.defaults(data, {
            'project_path': null
        });
        if (!data.project_path) {
            return;
        }
        if (!data.subdomain) {
            return;
        }
        subdomain = data.subdomain;
        if (data.project_path.indexOf('package.json') >= 0) {
            packagePath = data.project_path;
            projectDir = path.resolve(path.dirname(packagePath));
        } else {
            projectDir = path.resolve(data.project_path);
            packagePath = projectDir + '/package.json';
        }
        if (!fs.existsSync(packagePath)) {
            return;
        }
        if (!fs.existsSync(projectDir)) {
            return;
        }
        this._readPackage(packagePath).then(function(data) {
            data.teamcity = data.teamcity || {};
            if (_.isEmpty(data.teamcity)) {
                return;
            }
            data.teamcity.name = data.name || null;
            if (!data.teamcity.name) {
                return;
            }
            data.teamcity.subdomain = subdomain;
            self.trigger('new_build', projectDir, data.teamcity);
            self.trigger('log', 'info', 'New build available', {
                'directory': projectDir,
                'options': data.teamcity
            });
        }, function(err) {
            self.trigger('log', 'info', 'Error reading package: ' + err, {
                'package': packagePath
            });
        });
    },

    /**
     * Returns the contents of the parsed `package.json` file.
     *
     * @param {String} packagePath - The absolute path to a `package.json` file
     * @returns {Promise}
     */
    '_readPackage': function(packagePath) {
        var d = Q.defer();
        fs.readFile(packagePath, 'utf-8', function(err, contents) {
            var parsed;
            if (err) {
                return d.reject(err);
            }
            try {
                parsed = JSON.parse(contents);
                d.resolve(parsed);
            } catch(err) {
                d.reject(err.message);
            }
        });
        return d.promise;
    }

});

MicroEvent.mixin(TCListener);

module.exports = TCListener;
