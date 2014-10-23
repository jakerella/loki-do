/*jshint node:true*/
'use strict';
var Q = require('q'),
    async = require('async'),
    fetchDropletCmd = require('./fetch-droplet');

/**
 *
 * @param {Speedboat} speedboat
 * @returns {Function}
 */
module.exports = function (speedboat, _fetchDropletCmd_) {
    var DEFAULT_DIR = '/opt/app';

    fetchDropletCmd = _fetchDropletCmd_ || fetchDropletCmd;

    return function runNpmCommand (options, cwd) {
        var fetchDroplet = fetchDropletCmd(speedboat),
            deferred = Q.defer(),
            promise = deferred.promise,
            dropletName = options.subdomain + '.' + options.configObject.hostname,
            cmdOptions = [];

        cwd = cwd || DEFAULT_DIR;

        if (options.command === 'install') {
            cmdOptions.push('--unsafe-perm');
        }

        fetchDroplet(dropletName)
            .then(function (droplet) {
                if (!droplet) {
                    throw new Error('Unable to retrieve droplet by name: ' + dropletName);
                }
                
                async.series([
                    
                    // Make the cwd directory if it doesn't exist (prevents errors)
                    // then change into it and run custom command
                    speedboat.plot(droplet.id, [
                        'mkdir ' + cwd + ';',
                        'cd ' + cwd + ';',
                        [
                            '[ -f "package.json" ] && npm run-script',
                            options.command,
                            cmdOptions.join(' '),
                            '|| echo "No package.json file found"'
                        ].join(' ')
                    ].join(' '))

                ], function (err, results) {
                    if (err) {
                        return deferred.reject(err);
                    }
                    deferred.resolve(results);
                });
            })
            .fail(function (err) {
                deferred.reject(err);
            });

        return promise;
    };
};