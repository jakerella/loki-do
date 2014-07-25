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
module.exports = function (speedboat, retryInterval, retryAttempts) {

	return function copyBuild (boxId) {
		var localBuildPath = path.resolve('.'),
			remoteTmpPath = '/opt/build-tmp',
			remoteBuildPath = path.join(remoteTmpPath, path.basename(localBuildPath)),
			remoteAppPath = '/opt/app',
            deferred = Q.defer(),
			promise = deferred.promise;

		var MOVE_DIR_CMD = ['mv', remoteBuildPath, remoteAppPath].join(' ');

		var RETRY_INTERVAL = Math.abs(retryInterval || (1000 * 30));
		var MAX_ATTEMPTS = retryAttempts || 3;
		var attempts = 0;
		var retry = true;
		var errors = [];

		async.doWhilst(function whilstAttempt (cb) {
			attempts += 1;
			retry = (attempts <= MAX_ATTEMPTS);
			console.info('attempt: %s, retry: %s', attempts, retry);
			// too many attempts, end the loop
			if (!retry) {
				errors.push(new Error('max attempts exceeded'));
				return cb(errors);
			}
			console.info('copying: %s to %s', localBuildPath, remoteTmpPath);
			speedboat.copyFolder(boxId, localBuildPath, remoteTmpPath, function (err) {
				if (err) {
					errors.push(err);
					// attempt another re-try once the countdown concludes
					var countdown = new Countdown(RETRY_INTERVAL);
					return countdown.on('end', cb);
				}
				// operation success, no more retries
				console.info('moving: %s to %s', remoteBuildPath, remoteAppPath);
				console.info(MOVE_DIR_CMD);
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