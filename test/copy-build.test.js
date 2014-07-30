/*global describe, it, beforeEach, afterEach, expect*/
// libraries
var chai = require('chai'),
	spies = require('chai-spies'),
	expect = chai.expect,
	Q = require('q');
chai.use(spies);

// code under test
var copyBuildCmd = require('../src/command/copy-build');

// mocks
var mockSpeedboat = require('./mock-speedboat');
var speedboat = {};
var droplet = {};
var RETRY_INTERVAL = 200;

describe('CopyBulid', function () {
	var _consoleLog, _consoleError

	beforeEach(function (done) {
		speedboat = mockSpeedboat();
		droplet.id = Date.now();

		_consoleLog = console.log;
		_consoleError = console.error;
		console.log = chai.spy(function() {}); // we don't really want to log stuff
		console.log._real = _consoleLog; // just in case we need it
		console.error = chai.spy(function() {}); // we don't really want to log stuff

		done();
	});

	afterEach(function() {
		// let's put the console methods back
		console.log = _consoleLog;
		console.error = _consoleError;
	});

	it('returns a command function', function (done) {
		var actual = copyBuildCmd(speedboat);
		expect(actual).to.be.a('function');
		actual = copyBuildCmd(speedboat, RETRY_INTERVAL);
		expect(actual).to.be.a('function');
		done();
	});

	describe('invoking the command function', function () {
		it('should succeed if the build folder contents are copied to the droplet and moved to the app folder directory', function (done) {
			var cmd = copyBuildCmd(speedboat, RETRY_INTERVAL);
			cmd(droplet.id).then(function () {
				expect(speedboat.copyFolder).to.have.been.called;
				expect(speedboat.runInstanceCommand).to.have.been.called;
				done();
			}, function () {
				done('deferred should not have been rejected');
			});
		});

		it('should fail if the build folder cannot be copied to the droplet after five retries', function (done) {
			this.timeout(5000);
			speedboat.copyFolder._rejectWith = new Error('copyFolder');
			var cmd = copyBuildCmd(speedboat, RETRY_INTERVAL, 5);
			cmd(droplet.id).then(function () {
				done('deferred should not have been resolved');
			}, function (err) {
				expect(speedboat.copyFolder).to.have.been.called.exactly(5);
				expect(speedboat.runInstanceCommand).to.have.been.called.exactly(0);
				expect(err).to.be.an('array');
				// one error for each failed attempt (5) +
				// one error for exeeding max attempts
				expect(err).to.have.length(6);
				done();
			});
		});

		it('should fail if the move command cannot be run on the droplet', function (done) {
			var expected = speedboat.runInstanceCommand._rejectWith = new Error('runInstanceCommand');
			var cmd = copyBuildCmd(speedboat, RETRY_INTERVAL);
			cmd(droplet.id).then(function () {
				done('deferred should not have been resolved');
			}, function (actual) {
				expect(speedboat.copyFolder).to.have.been.called.exactly(1);
				expect(speedboat.runInstanceCommand).to.have.been.called.exactly(1);
				expect(actual).to.equal(expected);
				done();
			});
		});
	});
});