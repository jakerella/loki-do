/*global describe, it, beforeEach, afterEach, expect*/
// libraries
var path = require('path'),
	chai = require('chai'),
	spies = require('chai-spies'),
	expect = chai.expect,
	Q = require('q');
chai.use(spies);

// code under test
var deployCmd = require('../src/command/deploy');

// mocks
var mockSpeedboat = require('./mock-speedboat');
var speedboat = {};
var droplet = {};

var scriptsPath = path.join(__dirname, 'mock-scripts');

describe('Deploy', function () {
	beforeEach(function (done) {
		speedboat = mockSpeedboat();
		droplet.id = Date.now();
		droplet.ip_address = '111.111.111.111';
		done();
	});

	it('returns a command function', function (done) {
		var actual = deployCmd(speedboat);
		expect(actual).to.be.a('function');
		done();
	});

	describe('when a droplet already exists', function () {
		it('should succeed if the deploy command is successful', function (done) {
			speedboat.getDropletByName._resolveWith = droplet;
			var cmd = deployCmd(speedboat);
			cmd(scriptsPath, 'hostname', 'subdomain').then(function () {
				done();
			}, function (err) {
				done('deferred should not have been rejected', err);
			});
		});
	});

	describe('when a droplet does not exist', function () {
		it('should succeed if the deploy command is successful', function (done) {
			speedboat.getDropletByName._resolveWith = null;
			speedboat.getDropletByName._rejectWith = null;
			speedboat.dropletGet._resolveWith = droplet;
			speedboat.provision._resolveWith = [droplet];
			speedboat.domainRecordGetAll._resolveWith = [];
			var cmd = deployCmd(speedboat);
			cmd(scriptsPath, 'hostname', 'subdomain').then(function () {
				done();
			}, function (err) {
				console.log(err);
				done('deferred should not have been rejected', err);
			});
		});
	});
});