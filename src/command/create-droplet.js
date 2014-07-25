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

	return function createDroplet (scriptsPath, hostname, subdomain) {
		var tmpDir = 'build-temp',
            deferred = Q.defer(),
			promise = deferred.promise;

		// TODO: why are these scripts being added here?
		var provisionScript = tmpDir + '/provision.sh',
			buildScript = tmpDir + '/build.sh',
			scripts = glob.sync(scriptsPath + '/*');

		if (fs.existsSync(provisionScript)) {
			scripts.push(provisionScript);
		}

		if (fs.existsSync(buildScript)) {
			scripts.push(buildScript);
		}

		// TODO: make provision options configurable
		speedboat.provision({
			name: [subdomain, '.', hostname].join(''),
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
			deferred.resolve(results[0]);
		});

		return promise;
	};
};