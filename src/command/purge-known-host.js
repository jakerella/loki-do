'use strict';
var Q = require('q');

module.exports = function (speedboat) {

	return function (ipAddress, knownHostsPath) {

		var deferred = Q.defer(),
			promise = deferred.promise;

		speedboat.purgeKnownHost(ipAddress, knownHostsPath, function (err) {
			if (err) {
				return deferred.reject(err);
			}
			deferred.resolve();
		});

		return promise;
	};
};

