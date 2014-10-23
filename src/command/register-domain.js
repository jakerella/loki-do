'use strict';
var Q = require('q'),
    async = require('async'),
    _ = require('lodash');

/**
 *
 * @param {Speedboat} speedboat
 * @returns {Function}
 */
module.exports = function (speedboat) {

    return function registerDomain (boxId, subdomain) {
        var deferred = Q.defer(),
            promise = deferred.promise;

        function getDropletById (cb) {
            speedboat.dropletGet(boxId, cb);
        }

        function purgeExistingDNSRecord (droplet, cb) {
            speedboat.domainRecordGetAll(speedboat._options.domain_id, function (err, results) {
                if (err) {
                    return cb(err);
                }

                var record = _.find(results, {
                    data: droplet.ip_address
                });

                if (!record) {
                    return cb(null, droplet);
                }

                speedboat.domainRecordDestroy(speedboat._options.domain_id, record.id, function (err) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, droplet);
                });
            });
        }

        function createDNSRecord (droplet, cb) {
            speedboat.domainRecordNew(speedboat._options.domain_id, 'A', droplet.ip_address, {
                'name': subdomain
            }, cb);
        }

        if (!speedboat._options.domain_id) {
            
            deferred.reject(new Error('Please specify a domain record ID to use as a base'));

        } else {
            async.waterfall([
                getDropletById,
                purgeExistingDNSRecord,
                createDNSRecord
            ], function (err) {
                if (err) {
                    return deferred.reject(err);
                }
                deferred.resolve();
            });
        }

        return promise;
    };
};