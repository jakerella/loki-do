/*global describe, it, beforeEach, afterEach*/
// libraries
var chai = require('chai'),
	spies = require('chai-spies'),
	expect = chai.expect,
	Q = require('q');

chai.use(spies);

// code under test
var runNpmCmd = require('../src/command/npm-command');

// mocks
var mockSpeedboat = require('./mock-speedboat');
var speedboat = {};
var fetchDropletMock;
var fetchDropletCmdMock = function () {
	return fetchDropletMock;
};

describe('Run npm command', function () {
	beforeEach(function (done) {
		speedboat = mockSpeedboat();

		fetchDropletMock = function () {
			var deferred = Q.defer(),
				promise = deferred.promise;
			deferred.resolve({ id: (new Date()).getTime() });
			return promise;
		};

		done();
	});

	it('returns a command function', function (done) {
		var actual = runNpmCmd(speedboat, fetchDropletCmdMock);
		expect(actual).to.be.a('function');
		done();
	});

	describe('invoking the command function', function () {
		it('should run the command', function (done) {
			speedboat.plot._resolveWith = [];
			var cmd = runNpmCmd(speedboat, fetchDropletCmdMock);
			cmd({
				command: 'test',
				subdomain: 'foo',
				configObject: {
					hostname: 'bar.com'
				}
			}).then(function () {
				expect(speedboat.plot).to.have.been.called.exactly(1);
				done();
			}, function (err) {
				done(err);
			});
		});

		it('should fail if plotted command fails', function (done) {
			var expected = speedboat.plot._rejectWith = new Error('mock error');

			var cmd = runNpmCmd(speedboat, fetchDropletCmdMock);
			cmd({
				command: 'test',
				subdomain: 'foo',
				configObject: {
					hostname: 'bar.com'
				}
			}).then(function () {
				done('deferred should not have been resolved');
			}, function (err) {
				expect(err).to.equal(expected);
				done();
			});
		});
	});
});