'use strict';
var Q = require('q'),
	async = require('async'),
	syncBuildCmd = require('./sync-build');

/**
 *
 * @param {Speedboat} speedboat
 * @returns {Function}
 */
module.exports = function (speedboat) {

	var syncBuild = syncBuildCmd(speedboat);

	return function updateDroplet (droplet, buildPath) {
		var deferred = Q.defer(),
			promise = deferred.promise;

		syncBuild(droplet.id, buildPath).then(function onSyncSuccess () {
			deferred.resolve();
		}, function onSyncFailure (err) {
			deferred.reject(err);
		});

		return promise;
	};
};