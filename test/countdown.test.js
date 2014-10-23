/*global describe, it, beforeEach, afterEach, expect*/
// libraries
var chai = require('chai'),
    spies = require('chai-spies'),
    expect = chai.expect,
    Q = require('q');
chai.use(spies);

// code under test
var Countdown = require('../src/countdown');

describe('Countdown', function () {
    beforeEach(function (done) {
        done();
    });

    it('has default values', function (done) {
        var c = new Countdown(1000);
        expect(c.startAt).to.equal(0);
        expect(c.endAt).to.equal(-1);
        expect(c.interval).to.equal(1000);
        done();
    });

    it('emits a start event when the countdown commences', function (done) {
        var c = new Countdown(1000);
        c.on('start', function () {
            done();
        });
    });

    it('emits an end event when the countdown completes', function (done) {
        var isStarted = false;
        var c = new Countdown(1000);
        c.on('start', function () {
            isStarted = true;
        });
        c.on('end', function () {
            expect(isStarted).to.be.true;
            done();
        });
    });
});