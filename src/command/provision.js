/*jshint node:true*/
'use strict';
var Q = require('q'),
	async = require('async'),
	fetchDropletCmd = require('./fetch-droplet'),
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

	var GITHUB_KEY_LOC = '~/.ssh/github.priv',
		fetchDroplet = logCmd('fetchDroplet', fetchDropletCmd(speedboat)),
		createDroplet = logCmd('createDroplet', createDropletCmd(speedboat)),
		registerDomain = logCmd('registerDomain', registerDomainCmd(speedboat)),
		purgeKnownHost = logCmd('purgeKnownHost', purgeKnownHostCmd(speedboat));

	return function provision (options) {

		function deployToNew() {
			return createDroplet(
				options.configObject.hostname,
				options.configObject.image_id,
				options.subdomain
			).then(function (droplet) {
				return droplet;
			}).then(function (droplet) {
				return purgeKnownHost(droplet.id, '~/.ssh/known_hosts').then(function () {
					return droplet;
				});
			}).then(function (droplet) {
				return registerDomain(droplet.id, options.subdomain).then(function () {
					return droplet;
				});
			});
		}

		var deferred = Q.defer(),
			promise = deferred.promise,
			temp = '/opt/' + options.configObject.temp;

		var dropletName = [options.subdomain, '.', options.configObject.hostname].join('');
		fetchDroplet(dropletName).then(function (droplet) {
			
			if (!droplet) {
				return deployToNew();
			}

			// in any case, we need the droplet in the next step,
			// so we'll return the fetched droplet here...
			return droplet;

		}).then(function (droplet) {

			async.series([

				// Clear out any previous temp project files
				speedboat.plot(droplet.id, [
					'rm -rf ' + temp
				].join(' ')),

				// Clone the project into the temp directory
				speedboat.plot(droplet.id, [
					'cd /opt;',
					'ssh-agent bash -c \'ssh-add ' + GITHUB_KEY_LOC + '; git clone ' + options.vcsurl + ' ' + options.configObject.temp + '\''
				].join(' ')),

				// run the proivision step of the scripts block (if it exists)
				speedboat.plot(droplet.id, [
					'cd ' + temp + ';',
					'npm run-script ' + options.command
				].join(' ')),

				// Install any dependencies
				speedboat.plot(droplet.id, [
					'cd ' + temp + ';',
					'npm install --unsafe-perm'
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