'use strict';
var Q = require('q'),
	async = require('async');

/**
 *
 * @param {Speedboat} speedboat
 * @returns {Function}
 */
module.exports = function (speedboat) {

	var DELETE_CMD = 'rm -rf /opt/app;';

	return function deleteBuild (boxId) {
		var deferred = Q.defer(),
			promise = deferred.promise;

		speedboat.plot(boxId, DELETE_CMD, function (err/*, result*/) {
			if (err) {
				return deferred.reject(err);
			}
			deferred.resolve();
		});

		return promise;
	};
};