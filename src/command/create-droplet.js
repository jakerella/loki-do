/*jshint node:true*/
'use strict';
var Q = require('q');

/**
 *
 * @param {Speedboat} speedboat
 * @returns {Function}
 */
module.exports = function (speedboat) {

    return function createDroplet (hostname, image, subdomain) {
        var tmpDir = 'build-temp',
            deferred = Q.defer(),
            promise = deferred.promise;

        // TODO: make provision options configurable
        speedboat.provision({
            name: [subdomain, '.', hostname].join(''),
            size: 66,
            image: image,
            region: 4,
            private_networking: true,
            folders: [],
            scripts: []
        }, function(err, results) {
            if (err) {
                return deferred.reject(err);
            }
            deferred.resolve(results[0]);
        });

        return promise;
    };
};