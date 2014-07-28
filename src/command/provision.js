/*jshint node:true*/
'use strict';
var Q = require('q'),
	async = require('async'),
	fetchDropletCmd = require('./fetch-droplet'),
	updateDropletCmd = require('./update-droplet'),
	createDropletCmd = require('./create-droplet'),
	registerDomainCmd = require('./register-domain'),
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
		purgeKnownHost = logCmd('purgeKnownHost', purgeKnownHostCmd(speedboat));

	return function provision (options) {

		function deployToExisting(droplet) {
			return updateDroplet(droplet);
		}

		function deployToNew() {
			return createDroplet(
				options.configObject.hostname,
				options.configObject.image_id,
				options.subdomain
			).then(function (droplet) {
				return droplet;
			}).then(function (droplet) {
				return purgeKnownHost(droplet.id, '/home/buildagent/.ssh/known_hosts').then(function () {
					return droplet;
				});
			}).then(function (droplet) {
				return registerDomain(droplet.id, options.subdomain).then(function () {
					return droplet;
				});
			});
		}

		var deferred = Q.defer(),
			promise = deferred.promise;

		var dropletName = [options.subdomain, '.', options.configObject.hostname].join('');
		fetchDroplet(dropletName).then(function (droplet) {
			
			if (!droplet) {
				return deployToNew();
			}
			
			return deployToExisting(droplet);

		}).then(function (droplet) {

			async.series([
				
				speedboat.plot(droplet.id, [
					['cd ', options.configObject.temp, ';'].join(' '),
					['rm -rf project-build/;']
				].join(' ')),

				speedboat.plot(droplet.id, [
					['cd ', options.configObject.temp, ';'].join(' '),
					['git clone ', options.vcsurl].join(' ')
				].join(' ')),

				speedboat.plot(droplet.id, [
					['cd ', options.configObject.temp, ';'].join(' '),
					['cd project-build/;'].join(' '),
					['npm ', options.command].join(' ')
				].join(' '))

			], function (err, results) {
				if (err) {
					return deferred.reject(err);
				}
				deferred.resolve(results);
			});

			deferred.resolve();

		}).fail(function (err) {
			deferred.reject(err);
		})
		.done();

		return promise;
	};
};