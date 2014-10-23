/*jshint node:true*/
'use strict';
var Q = require('q'),
    async = require('async'),
    fetchDropletCmd = require('./fetch-droplet');

/**
 *
 * @param {Speedboat} speedboat
 * @returns {Function}
 */
module.exports = function (speedboat) {

    var fetchDroplet = fetchDropletCmd(speedboat);

    return function provision (options) {

        var deferred = Q.defer(),
            promise = deferred.promise,
            destination = '/opt/' + options.configObject.destination;

        var dropletName = [options.subdomain, '.', options.configObject.hostname].join('');
        fetchDroplet(dropletName).then(function (droplet) {
            
            if (!droplet) {
                throw new Error("Unable to retrieve droplet at " + dropletName);
            }

            // We need the droplet in the next step
            return droplet;

        }).then(function (droplet) {

            async.series([

                // The app should already be stopped, but no way for us 
                // to check that since we don't know what is involved in 
                // that process, instead, just march forward...
                
                // Clear out any previous project files and recreate dir
                speedboat.plot(droplet.id, [
                    'rm -rf ' + destination
                ].join(' ')),

                // Copy files from temp location to destination
                speedboat.plot(droplet.id, [
                    'cp -ra /opt/' + options.configObject.temp + '/. ' + destination
                ].join(' ')),

                // run the deploy step of the scripts block (if it exists)
                speedboat.plot(droplet.id, [
                    'cd ' + destination + '; ',
                    'npm run-script deploy'
                ].join(' '))

            ], function (err, results) {
                if (err) {
                    return deferred.reject(err);
                }
                deferred.resolve(results);
            });

        }).fail(function (err) {
            deferred.reject(err);
        })
        .done();

        return promise;
    };
};