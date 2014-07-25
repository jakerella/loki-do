'use strict';
var Q = require('q'),
	async = require('async'),
	fetchDropletCmd = require('./fetch-droplet'),
	updateDropletCmd = require('./update-droplet'),
	createDropletCmd = require('./create-droplet'),
	registerDomainCmd = require('./register-domain'),
	restartAppCmd = require('./restart-app'),
	copyBuildCmd = require('./copy-build'),
	startAppCmd = require('./start-app'),
	purgeKnownHostCmd = require('./purge-known-host');

function logCmd(name, cmd) {
	return function () {
		console.info('>', name, arguments);
		return cmd.apply(null, arguments).then(function (result) {
			console.info('<', name, arguments);
			return result;
		}, function (err) {
			console.error('X', name, JSON.stringify(err), err.trace || '');
			throw err;
		});
	};
}

/**
 *
 * @param {Speedboat} speedboat
 * @returns {Function}
 */
module.exports = function (speedboat) {

	var fetchDroplet = logCmd('fetchDroplet', fetchDropletCmd(speedboat)),
		updateDroplet = logCmd('updateDroplet', updateDropletCmd(speedboat)),
		createDroplet = logCmd('createDroplet', createDropletCmd(speedboat)),
		registerDomain = logCmd('registerDomain', registerDomainCmd(speedboat)),
		restartApp = logCmd('restartApp', restartAppCmd(speedboat)),
		copyBuild = logCmd('copyBuild', copyBuildCmd(speedboat)),
		startApp = logCmd('startApp', startAppCmd(speedboat)),
		purgeKnownHost = logCmd('purgeKnownHost', purgeKnownHostCmd(speedboat));

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
				return purgeKnownHost(droplet.ip_address, '/home/buildagent/.ssh/known_hosts').then(function () {
					return droplet;
				});
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
		}).fail(function (err) {
			deferred.reject(err);
		})
		.done();

		return promise;
	};
};