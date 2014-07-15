'use strict';
var Q = require('q'),
	async = require('async'),
	Countdown = require('../countdown'),
	path = require('path');

/**
 *
 * @param {Speedboat} speedboat
 * @returns {Function}
 */
module.exports = function (speedboat) {

	return function copyBuild (boxId, directory) {
		var deferred = Q.defer(),
			promise = deferred.promise;

		var MOVE_DIR_CMD = 'mv /opt/' + path.basename(directory) + ' /opt/app';

		var MAX_ATTEMPTS = 5;
		var RETRY_INTERVAL = (1000 * 30);
		var attempts = 0;

		async.doWhilst(function whilstAttempt (cb) {
			attempts += 1;
			speedboat.copyFolder(boxId, directory, '/opt', function (err) {
				if (err) {
					if (attempts === 5) {
						return cb(err);
					}
					var countdown = new Countdown(RETRY_INTERVAL);
					return countdown.on('end', cb);
				}
				speedboat.runInstanceCommand(boxId, MOVE_DIR_CMD, function (err) {
					if (err) {
						return deferred.reject(err);
					}
					return deferred.resolve();
				});
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