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
	var DEFAULT_DIR = '/opt/app',
		fetchDropletCmd = _fetchDropletCmd_ || fetchDropletCmd;

	return function runNpmCommand (options, cwd) {
		var fetchDroplet = fetchDropletCmd(speedboat),
			deferred = Q.defer(),
			promise = deferred.promise,
			dropletName = options.subdomain + '.' + options.configObject.hostname;

		cwd = cwd || DEFAULT_DIR;

		fetchDroplet(dropletName)
			.then(function (droplet) {
				if (!droplet) {
					throw new Error('Unable to retrieve droplet by name: ' + dropletName);
				}
				
				async.series([
					
					speedboat.plot(droplet.id, [
						'cd' + cwd + ';',
						'npm run-script ' + options.command
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