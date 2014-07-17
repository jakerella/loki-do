'use strict';
var Q = require('q'),
	async = require('async'),
	Countdown = require('../countdown'),
	path = require('path');

/**
 * Copy build command
 * @param {Speedboat} speedboat
 * @returns {Function}
 */
module.exports = function (speedboat, retryInterval) {

	return function copyBuild (boxId, deployDirectory) {
		var deferred = Q.defer(),
			promise = deferred.promise;

		var MOVE_DIR_CMD = 'mv /opt/' + path.basename(deployDirectory) + ' /opt/app';

		var RETRY_INTERVAL = Math.abs(retryInterval || (1000 * 30));
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
			speedboat.copyFolder(boxId, deployDirectory, '/opt', function (err) {
				if (err) {
					errors.push(err);
					// attempt another re-try once the countdown concludes
					var countdown = new Countdown(RETRY_INTERVAL);
					return countdown.on('end', cb);
				}
				// operation success, no more retries
				speedboat.runInstanceCommand(boxId, MOVE_DIR_CMD, function (err) {
					if (err) {
						return deferred.reject(err);
					}
					return deferred.resolve();
				});
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