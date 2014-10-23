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

        // TODO: is this an account id?
        var APPENDTO_ID = '328048';

        function getDropletById (cb) {
            speedboat.dropletGet(boxId, cb);
        }

        function purgeExistingDNSRecord (droplet, cb) {
            speedboat.domainRecordGetAll(APPENDTO_ID, function (err, results) {
                if (err) {
                    return cb(err);
                }

                var record = _.find(results, {
                    data: droplet.ip_address
                });

                if (!record) {
                    return cb(null, droplet);
                }

                speedboat.domainRecordDestroy(APPENDTO_ID, record.id, function (err) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, droplet);
                });
            });
        }

        function createDNSRecord (droplet, cb) {
            speedboat.domainRecordNew(APPENDTO_ID, 'A', droplet.ip_address, {
                'name': subdomain
            }, cb);
        }

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

        return promise;
    };
};