/*global describe, it, beforeEach, afterEach, expect*/
// libraries
var chai = require('chai'),
    spies = require('chai-spies'),
    expect = chai.expect,
    Q = require('q');
chai.use(spies);

// code under test
var restartAppCmd = require('../src/command/restart-app');

// mocks
var mockSpeedboat = require('./mock-speedboat');
var speedboat = {};
var droplet = {};

describe('RestartApp', function () {
    beforeEach(function (done) {
        speedboat = mockSpeedboat();
        droplet.id = Date.now();
        done();
    });

    it('returns a command function', function (done) {
        var actual = restartAppCmd(speedboat);
        expect(actual).to.be.a('function');
        done();
    });

    describe('invoking the command function', function () {
        it('should start the app if all plotted commands are successful', function (done) {
            var cmd = restartAppCmd(speedboat);
            cmd(droplet.id).then(function () {
                expect(speedboat.plot).to.have.been.called.exactly(2);
                done();
            }, function () {
                done('deferred should not have been rejected');
            });
        });

        it('should fail if any plotted command fails', function (done) {
            var expected = new Error('mock error');
            var called = 0;
            speedboat.plot = chai.spy(function () {
                return function (cb) {
                    // fail on the third call to plot
                    if (++called === 2) {
                        return cb(expected);
                    }
                    return cb(null);
                }
            });
            var cmd = restartAppCmd(speedboat);
            cmd(droplet.id).then(function () {
                done('deferred should not have been resolved');
            }, function (err) {
                expect(err).to.equal(expected);
                done();
            });
        });
    });
});