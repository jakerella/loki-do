'use strict';
var Q = require('q'),
	async = require('async'),
	glob = require('glob'),
	fs = require('fs');

/**
 *
 * @param {Speedboat} speedboat
 * @returns {Function}
 */
module.exports = function (speedboat) {

	return function createDroplet (buildPath, scriptsPath, hostname, subdomain) {
		var deferred = Q.defer(),
			promise = deferred.promise;

		var provisionScript = buildPath + '/provision.sh',
			buildScript = buildPath + '/build.sh',
			scripts = glob.sync(scriptsPath + '/*');

		// TODO: why are these scripts being added here?
		if (fs.existsSync(provisionScript)) {
			scripts.push(provisionScript);
		}

		if (fs.existsSync(buildScript)) {
			scripts.push(buildScript);
		}

		speedboat.provision({
			name: subdomain + '.' + hostname,
			size: 66,
			image: 4426659,
			region: 4,
			private_networking: true,
			folders: [],
			scripts: scripts
		}, function(err, results) {
			if (err) {
				return deferred.reject(err);
			}
			deferred.resolve(results);
		});

		return promise;
	};
};