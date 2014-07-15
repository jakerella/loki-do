'use strict';
var Q = require('q'),
	async = require('async');

/**
 *
 * @param {Speedboat} speedboat
 * @returns {Function}
 */
module.exports = function (speedboat) {

	return function fetchDroplet (hostname) {
		var deferred = Q.defer(),
			promise = deferred.promise;

		speedboat.getDropletByName(hostname, function(err, droplet) {
			if (err) {
				self.trigger('log', 'error', err.toString());
				return deferred.reject(err);
			}
			deferred.resolve(droplet);
		});

		return promise;
	};
};