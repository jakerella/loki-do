/*global describe, it, beforeEach, afterEach, expect*/
// libraries
var chai = require('chai'),
	spies = require('chai-spies'),
	expect = chai.expect,
	Q = require('q');
chai.use(spies);

// code under test
var deleteBuildCmd = require('../src/command/delete-build');

// mocks
var mockSpeedboat = require('./mock-speedboat');
var speedboat = {};
var droplet = {};

describe('DeleteBulid', function () {
	beforeEach(function (done) {
		speedboat = mockSpeedboat();
		droplet.id = Date.now();
		done();
	});

	it('returns a command function', function (done) {
		var actual = deleteBuildCmd(speedboat);
		expect(actual).to.be.a('function');
		done();
	});

	describe('invoking the command function', function () {
		it('should succeed if the delete command is successful', function (done) {
			var cmd = deleteBuildCmd(speedboat);
			cmd(droplet.id).then(function () {
				expect(speedboat.plot).to.have.been.called;
				done();
			}, function () {
				done('deferred should not have been rejected');
			});
		});

		it('should fail if the delete command is not successful', function (done) {
			var expected = speedboat.plot._rejectWith = new Error('mock error');
			var cmd = deleteBuildCmd(speedboat);
			cmd(droplet.id).then(function () {
				done('deferred should not have been resolved');
			}, function (err) {
				expect(err).to.equal(expected);
				done();
			});
		});
	});
});