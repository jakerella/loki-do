/*global describe, it, beforeEach, afterEach*/
// libraries
var path = require('path'),
	chai = require('chai'),
	spies = require('chai-spies'),
	expect = chai.expect,
	Q = require('q');
chai.use(spies);

// code under test
var provisionCmd = require('../src/command/provision');

// mocks
var mockSpeedboat = require('./mock-speedboat');
var speedboat = {};
var droplet = {};

var scriptsPath = path.join(__dirname, 'mock-scripts');

describe('Deploy', function () {
	var _consoleInfo, _consoleError;

	beforeEach(function (done) {
		speedboat = mockSpeedboat();
		droplet.id = Date.now();
		droplet.ip_address = '111.111.111.111';

		_consoleInfo = console.info;
		_consoleError = console.error;
		console.info = chai.spy(function() {}); // we don't really want to log stuff
		console.info._real = _consoleInfo; // just in case we need it
		console.error = chai.spy(function() {}); // we don't really want to log stuff

		done();
	});

	afterEach(function() {
		// let's put the console methods back
		console.info = _consoleInfo;
		console.error = _consoleError;
	});

	it('returns a command function', function (done) {
		var actual = provisionCmd(speedboat);
		expect(actual).to.be.a('function');
		done();
	});

	describe('when a droplet already exists', function () {
		it('should succeed if the deploy command is successful', function (done) {
			speedboat.getDropletByName._resolveWith = droplet;
			var cmd = provisionCmd(speedboat);
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
			var cmd = provisionCmd(speedboat);
			cmd(scriptsPath, 'hostname', 'subdomain').then(function () {
				done();
			}, function (err) {
				console.log(err);
				done('deferred should not have been rejected', err);
			});
		});
	});
});