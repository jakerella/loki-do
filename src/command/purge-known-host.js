'use strict';
var Q = require('q');

module.exports = function (speedboat) {

	return function (boxId, knownHostsPath) {

		var deferred = Q.defer(),
			promise = deferred.promise;

		speedboat.dropletGet(boxId, function (err, droplet) {
			if (err) {
				return deferred.reject(err);
			}

			speedboat.purgeKnownHost(droplet.ip_address, knownHostsPath, function (err) {
				if (err) {
					return deferred.reject(err);
				}
				deferred.resolve();
			});
		});

		return promise;
	};
};

