/*global describe, it, beforeEach, afterEach*/
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

var options = {
	subdomain: 'subdomain',
	configObject: {
		hostname: 'hostname',
		destination: '/opt/app',
		image_id: 12345,
		digital_ocean: {}
	}
};

describe('Deploy', function () {

	beforeEach(function (done) {
		speedboat = mockSpeedboat();
		droplet.id = Date.now();

		done();
	});

	it('returns a command function', function (done) {
		var actual = deployCmd(speedboat);
		expect(actual).to.be.a('function');
		done();
	});

	describe('when a droplet exists', function () {
		it('should succeed if the deploy command is successful', function (done) {
			speedboat.getDropletByName._resolveWith = droplet;

			var cmd = deployCmd(speedboat);
			cmd(options).then(function () {
				expect(speedboat.plot).to.have.been.called.exactly(3);
				done();
			}, function (err) {
				done(err);
			});
		});
	});

	describe('when a droplet does not exist', function () {
		it('should fail', function (done) {
			speedboat.getDropletByName._resolveWith = null;
			speedboat.getDropletByName._rejectWith = null;

			var cmd = deployCmd(speedboat);
			cmd(options).then(function () {
				done("should not not have been resolved");
			}, function (err) {
				expect(err instanceof Error).to.be.true;
				done();
			});
		});
	});
});