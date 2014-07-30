/*global describe, it, beforeEach, afterEach, expect*/
// libraries
var chai = require('chai'),
	spies = require('chai-spies'),
	expect = chai.expect,
	Q = require('q');
chai.use(spies);

// code under test
var fetchDropletCmd = require('../src/command/fetch-droplet');

// mocks
var mockSpeedboat = require('./mock-speedboat');
var speedboat = {};
var droplet = {};

describe('FetchDroplet', function () {
	beforeEach(function (done) {
		speedboat = mockSpeedboat();
		droplet.id = Date.now();
		done();
	});

	it('returns a command function', function (done) {
		var actual = fetchDropletCmd(speedboat);
		expect(actual).to.be.a('function');
		done();
	});

	describe('invoking the command function', function () {
		it('should succeed if the droplet is retrieved', function (done) {
			var expected = speedboat.getDropletByName._resolveWith = droplet;
			var cmd = fetchDropletCmd(speedboat);
			cmd('hostname').then(function (actual) {
				expect(speedboat.getDropletByName).to.have.been.called;
				expect(actual).to.equal(expected);
				done();
			}, function () {
				done('deferred should not have been rejected');
			});
		});

		it('should fail if the droplet cannot be retrieved', function (done) {
			var expected = speedboat.getDropletByName._rejectWith = new Error('mock error');
			var cmd = fetchDropletCmd(speedboat);
			cmd('hostname').then(function () {
				done('deferred should not have been resolved');
			}, function (actual) {
				expect(actual).to.equal(expected);
				done();
			});
		});
	});
});