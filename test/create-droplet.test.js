/*global describe, it, beforeEach, afterEach, expect*/
// libraries
var path = require('path'),
	chai = require('chai'),
	spies = require('chai-spies'),
	expect = chai.expect,
	Q = require('q');
chai.use(spies);

// code under test
var createDropletCmd = require('../src/command/create-droplet');

// mocks
var mockSpeedboat = require('./mock-speedboat');
var speedboat = {};
var droplet = {};

describe('CreateDroplet', function () {
	beforeEach(function (done) {
		speedboat = mockSpeedboat();
		droplet.id = Date.now();
		done();
	});

	it('returns a command function', function (done) {
		var actual = createDropletCmd(speedboat);
		expect(actual).to.be.a('function');
		done();
	});

	describe('invoking the command function', function () {
		it('should succeed if the droplet is provisioned', function (done) {
			speedboat.provision._resolveWith = [droplet];
			var cmd = createDropletCmd(speedboat);
			cmd('hostname', 12345, 'subdomain').then(function (actual) {
				expect(speedboat.provision).to.have.been.called;
				expect(actual).to.equal(droplet);
				done();
			}, function () {
				done('deferred should not have been rejected');
			});
		});

		it('should fail if the droplet is not provisioned', function (done) {
			var expected = speedboat.provision._rejectWith = new Error('provision');
			var cmd = createDropletCmd(speedboat);
			cmd('hostname', 12345, 'subdomain').then(function () {
				done('deferred should not have been resolved');
			}, function (actual) {
				expect(actual).to.equal(expected);
				done();
			});
		});
	});

	describe('generating provision options', function () {
		it('should combine subdomain and hostname', function (done) {
			speedboat.provision._resolveWith = droplet;
			var cmd = createDropletCmd(speedboat);
			cmd('hostname', 12345, 'subdomain').then(function () {
				expect(speedboat.provision._args).to.have.length(2);
				expect(speedboat.provision._args[0].name).to.equal('subdomain.hostname');
				done();
			}, function () {
				done('deferred should not have been rejected');
			});
		});
	});
});