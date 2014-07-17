/*global describe, it, beforeEach, afterEach, expect*/
// libraries
var chai = require('chai'),
	spies = require('chai-spies'),
	expect = chai.expect,
	Q = require('q');
chai.use(spies);

// code under test
var updateDropletCmd = require('../src/command/update-droplet');

// mocks
var mockSpeedboat = require('./mock-speedboat');
var speedboat = {};
var droplet = {};

describe('UpdateDroplet', function () {
	beforeEach(function (done) {
		speedboat = mockSpeedboat();
		droplet.id = Date.now();
		done();
	});

	it('returns a command function', function (done) {
		var actual = updateDropletCmd(speedboat);
		expect(actual).to.be.a('function');
		done();
	});

	describe('invoking the command function', function () {
		it('should succeed if the folder gets copied', function (done) {
			var cmd = updateDropletCmd(speedboat);
			cmd(droplet, '/mock/build/path').then(function () {
				expect(speedboat.copyFolder).to.have.been.called;
				done();
			}, function () {
				done('deferred should not have been rejected');
			});
		});

		it('should fail if the folder cannot be copied', function (done) {
			speedboat.copyFolder._rejectWith = new Error('mock error');
			var cmd = updateDropletCmd(speedboat);
			cmd(droplet, '/mock/build/path').then(function () {
				done('deferred should not have been resolved');
			}, function (err) {
				expect(err).to.be.an('array');
				done();
			});
		});
	});
});