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
    var CHMOD_SCRIPTS = 'chmod +x ./provision.sh; chmod +x ./stop.sh; chmod +x ./start.sh;';
    var PROVISION = './provision.sh;';
    var START = './stop.sh; ./start.sh > /dev/null &';

    var SET_PERMISSIONS_CMD = [CD_APP, CHMOD_SCRIPTS].join(' ');
    var PROVISION_APP_CMD = [CD_APP, PROVISION].join(' ');
    var START_APP_CMD = [CD_APP, START].join(' ');

    return function startApp (boxId) {
        var deferred = Q.defer(),
            promise = deferred.promise;

        async.series([
            speedboat.plot(boxId, SET_PERMISSIONS_CMD),
            speedboat.plot(boxId, PROVISION_APP_CMD),
            speedboat.plot(boxId, START_APP_CMD)
        ], function (err/*, results*/) {
            if (err) {
                return deferred.reject(err);
            }
            deferred.resolve();
        });

        return promise;
    };
};