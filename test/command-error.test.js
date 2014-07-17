/*global describe, it, beforeEach, afterEach, expect*/
// libraries
var chai = require('chai'),
	spies = require('chai-spies'),
	expect = chai.expect,
	Q = require('q');
chai.use(spies);

// code under test
var CommandError = require('../src/command/command-error');

describe('CommandError', function () {
	describe('ctor', function () {
		it('should have default values', function (done) {
			var e = new CommandError();
			expect(e.name).to.equal('CommandError');
			expect(e.message).to.be.empty;
			expect(e.cmd).to.be.empty;
			expect(e.innerError).to.be.null;
			done();
		});

		it('should have a message', function (done) {
			var expected = 'expected';
			var e = new CommandError(expected);
			expect(e.message).to.equal(expected);
			done();
		});

		it('should have a cmd', function (done) {
			var expected = 'command';
			var e = new CommandError(null, expected);
			expect(e.cmd).to.equal(expected);
			done();
		});

		it('should have a stack trace', function (done) {
			expect(new CommandError().stack).to.not.be.empty;
			done();
		});

		it('should be an instance of command error', function (done) {
			expect(new CommandError()).to.be.instanceOf(CommandError);
			done();
		});

		it('should be an instance of error', function (done) {
			expect(new CommandError()).to.be.instanceOf(Error);
			done();
		});
	});
});