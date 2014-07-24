/*global describe, it, beforeEach, afterEach, expect*/
// libraries
var chai = require('chai'),
	spies = require('chai-spies'),
	expect = chai.expect,
	Q = require('q');
chai.use(spies);

// code under test
var syncBuildCommand = require('../src/command/sync-build');

// mocks
var mockSpeedboat = require('./mock-speedboat');
var speedboat = {};
var droplet = {};

describe('SyncBuild', function () {
	beforeEach(function (done) {
		speedboat = mockSpeedboat();
		droplet.id = Date.now();
		done();
	});

	it('returns a command function', function (done) {
		var actual = syncBuildCommand(speedboat);
		expect(actual).to.be.a('function');
		done();
	});

	describe('invoking the command function', function () {
		it('should succeed if the folder gets copied', function (done) {
			var cmd = syncBuildCommand(speedboat);
			cmd(droplet).then(function () {
				expect(speedboat.copyFolder).to.have.been.called;
				done();
			}, function () {
				done('deferred should not have been rejected');
			});
		});

		it('should fail if the folder cannot be copied', function (done) {
			speedboat.copyFolder._rejectWith = new Error('mock error');
			var cmd = syncBuildCommand(speedboat);
			cmd(droplet.id).then(function () {
				done('deferred should not have been resolved');
			}, function (err) {
				expect(err).to.be.an('array');
				done();
			});
		});

		it('should retry up to five times if the copy operation fails', function (done) {
			speedboat.copyFolder._rejectWith = new Error('mock error');
			var cmd = syncBuildCommand(speedboat);
			cmd(droplet.id).then(function () {
				done('deferred should not have been resolved');
			}, function (err) {
				expect(speedboat.copyFolder).to.have.been.called.exactly(5);
				expect(err).to.be.an('array');
				// one error for each failed attempt (5) +
				// one error for exeeding max attempts
				expect(err).to.have.length(6);
				done();
			});
		});
	});
});