'use strict';
var Q = require('q'),
	async = require('async');

function endsWith(str, char) {
	return !!str.length &&
		str.charAt(str.length - 1) === char;
}

/**
 *
 * @param {Speedboat} speedboat
 * @returns {Function}
 */
module.exports = function (speedboat) {

	return function syncBuild (boxId, buildPath) {
		var deferred = Q.defer(),
			promise = deferred.promise;

		if (!buildPath.endsWith('/')) {
			buildPath += '/';
		}

		var MAX_ATTEMPTS = 5;
		var attempts = 0;

		async.doWhilst(function whilstAttempt (cb) {
			attempts += 1;
			speedboat.copyFolder(boxId, buildPath, '/opt/app/', function (err) {
				if (err) {
					console.error(err.toString());
					if (attempts === MAX_ATTEMPTS) {
						return cb(err);
					}
				}
				cb(null);
			});
		}, function whilstTest () {
			return attempts < MAX_ATTEMPTS;
		}, function whilstFinished (err) {
			if (err) {
				return deferred.reject(err);
			}
			deferred.resolve();
		});

		return promise;
	};
};