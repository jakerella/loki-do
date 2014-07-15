'use strict';
var Q = require('q'),
	async = require('async');

/**
 *
 * @param {Speedboat} speedboat
 * @returns {Function}
 */
module.exports = function (speedboat) {

	var CD_APP = 'cd /opt/app;';
	var CHMOD_SCRIPTS = 'chmod +x ./update.sh; chmod +x ./stop.sh; chmod +x ./start.sh;';
	var RESTART = './update.sh; ./stop.sh; ./start.sh > /dev/null &';

	var SET_PERMISSIONS_CMD = [CD_APP, CHMOD_SCRIPTS].join(' ');
	var RESTART_APP_CMD = [CD_APP, RESTART].join(' ');

	return function restartApp (boxId) {
		var deferred = Q.defer(),
			promise = deferred.promise;

		async.series([
			speedboat.plot(boxId, SET_PERMISSIONS_CMD),
			speedboat.plot(boxId, RESTART_APP_CMD)
		], function (err/*, results*/) {
			if (err) {
				return deferred.reject(err);
			}
			deferred.resolve();
		});

		return promise;
	};
};