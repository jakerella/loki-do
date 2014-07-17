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

		if (!endsWith(buildPath, '/')) {
			buildPath += '/';
		}

		var MAX_ATTEMPTS = 5;
		var attempts = 0;
		var retry = true;
		var errors = [];

		async.doWhilst(function whilstAttempt (cb) {
			attempts += 1;
			retry = (attempts <= MAX_ATTEMPTS);
			// too many attempts, end the loop
			if (!retry) {
				errors.push(new Error('max attempts exceeded'));
				return cb(errors);
			}
			speedboat.copyFolder(boxId, buildPath, '/opt/app/', function (err) {
				if (err) {
					errors.push(err);
					// attempt another re-try
					return cb(null);
				}
				// operation success, no more retries
				retry = false;
				cb(null);
			});
		}, function whilstTest () {
			return retry;
		}, function whilstFinished (err) {
			if (err) {
				return deferred.reject(err);
			}
			deferred.resolve();
		});

		return promise;
	};
};