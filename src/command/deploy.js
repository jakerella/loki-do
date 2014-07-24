'use strict';
var Q = require('q'),
	async = require('async'),
	fetchDropletCmd = require('./fetch-droplet'),
	updateDropletCmd = require('./update-droplet'),
	createDropletCmd = require('./create-droplet'),
	registerDomainCmd = require('./register-domain'),
	restartAppCmd = require('./restart-app'),
	copyBuildCmd = require('./copy-build'),
	startAppCmd = require('./start-app');

/**
 *
 * @param {Speedboat} speedboat
 * @returns {Function}
 */
module.exports = function (speedboat) {

	var fetchDroplet = fetchDropletCmd(speedboat),
		updateDroplet = updateDropletCmd(speedboat),
		createDroplet = createDropletCmd(speedboat),
		registerDomain = registerDomainCmd(speedboat),
		restartApp = restartAppCmd(speedboat),
		copyBuild = copyBuildCmd(speedboat),
		startApp = startAppCmd(speedboat);

	return function deploy (scriptsPath, hostname, subdomain) {

		function deployToExisting(droplet) {
			return updateDroplet(droplet).then(function () {
				return restartApp(droplet.id);
			});
		}

		function deployToNew() {
			return createDroplet(scriptsPath, hostname, subdomain).then(function (droplet) {
				return droplet;
			}).then(function (droplet) {
				return registerDomain(droplet.id, subdomain).then(function () {
					return droplet;
				});
			}).then(function (droplet) {
				return copyBuild(droplet.id).then(function () {
					return droplet;
				});
			}).then(function (droplet) {
				return startApp(droplet.id);
			});
		}

		var deferred = Q.defer(),
			promise = deferred.promise;

		fetchDroplet(subdomain).then(function (droplet) {
			if (!droplet) {
				return deployToNew();
			}
			return deployToExisting(droplet);
		}).then(function (/*result*/) {
			deferred.resolve();
		}).catch(function (err) {
			deferred.reject(err);
		});

		return promise;
	};
};