/*global describe, it, beforeEach, afterEach, expect*/
// libraries
var chai = require('chai'),
    spies = require('chai-spies'),
    expect = chai.expect,
    Q = require('q');
chai.use(spies);

// code under test
var registerDomainCmd = require('../src/command/register-domain');

// mocks
var mockSpeedboat = require('./mock-speedboat');
var speedboat = {};
var droplet = {};
var domainRecords = [];

describe('RegisterDomain', function () {
    beforeEach(function (done) {
        speedboat = mockSpeedboat();
        droplet.id = Date.now();
        droplet.ip_address = '111.111.111.111';
        domainRecords = [{data: '111.111.111.111'}, {data: '222.222.222.222'}, {data: '333.333.333.333'}];
        speedboat._options.domain_id = 123456;
        speedboat.dropletGet._resolveWith = droplet;
        speedboat.domainRecordGetAll._resolveWith = domainRecords;
        done();
    });

    it('returns a command function', function (done) {
        var actual = registerDomainCmd(speedboat);
        expect(actual).to.be.a('function');
        done();
    });

    it('should fail when no domain ID is supplied', function (done) {
        var noDomainSpeedboat = mockSpeedboat();
        noDomainSpeedboat._options.domain_id = null;
        
        var expected = new Error('Please specify a domain record ID to use as a base');
        var cmd = registerDomainCmd(noDomainSpeedboat);
        
        cmd(1, 'subdomain').then(function () {
            done('This command should fail with no domain present');
        }, function (actual) {
            expect(noDomainSpeedboat.dropletGet).to.have.been.called.exactly(0);
            expect(noDomainSpeedboat.domainRecordGetAll).to.have.been.called.exactly(0);
            expect(noDomainSpeedboat.domainRecordDestroy).to.have.been.called.exactly(0);
            expect(noDomainSpeedboat.domainRecordNew).to.have.been.called.exactly(0);

            expect(actual).to.deep.equal(expected);
            expect(1).to.equal(1);
            done();
        });
    });

    describe('when the droplet cannot be found', function () {
        it('rejects the deferred', function (done) {
            speedboat.dropletGet._resolveWith = null;
            var expected = speedboat.dropletGet._rejectWith = new Error('dropletGet');
            var cmd = registerDomainCmd(speedboat);
            cmd(1, 'subdomain').then(function () {
                done('deferred should not have been resolved');
            }, function (actual) {
                expect(speedboat.dropletGet).to.have.been.called.exactly(1);
                expect(speedboat.domainRecordGetAll).to.have.been.called.exactly(0);
                expect(speedboat.domainRecordDestroy).to.have.been.called.exactly(0);
                expect(speedboat.domainRecordNew).to.have.been.called.exactly(0);
                expect(actual).to.equal(expected);
                done();
            });
        });
    });

    describe('when the account domain records cannot be found', function () {
        it('rejects the deferred', function (done) {
            speedboat.domainRecordGetAll._resolveWith = null;
            var expected = speedboat.domainRecordGetAll._rejectWith = new Error('domainRecordGetAll');
            var cmd = registerDomainCmd(speedboat);
            cmd(1, 'subdomain').then(function () {
                done('deferred should not have been resolved');
            }, function (actual) {
                expect(speedboat.dropletGet).to.have.been.called.exactly(1);
                expect(speedboat.domainRecordGetAll).to.have.been.called.exactly(1);
                expect(speedboat.domainRecordDestroy).to.have.been.called.exactly(0);
                expect(speedboat.domainRecordNew).to.have.been.called.exactly(0);
                expect(actual).to.equal(expected);
                done();
            });
        });
    });

    describe('when the found domain record cannot be destroyed', function () {
        it('rejects the deferred', function (done) {
            speedboat.domainRecordDestroy._resolveWith = null;
            var expected = speedboat.domainRecordDestroy._rejectWith = new Error('domainRecordDestroy');
            var cmd = registerDomainCmd(speedboat);
            cmd(1, 'subdomain').then(function () {
                done('deferred should not have been resolved');
            }, function (actual) {
                expect(speedboat.dropletGet).to.have.been.called.exactly(1);
                expect(speedboat.domainRecordGetAll).to.have.been.called.exactly(1);
                expect(speedboat.domainRecordDestroy).to.have.been.called.exactly(1);
                expect(speedboat.domainRecordNew).to.have.been.called.exactly(0);
                expect(actual).to.equal(expected);
                done();
            });
        });
    });

    describe('when a new domain record cannot be created', function () {
        it('rejects the deferred', function (done) {
            speedboat.domainRecordNew._resolveWith = null;
            var expected = speedboat.domainRecordNew._rejectWith = new Error('domainRecordNew');
            var cmd = registerDomainCmd(speedboat);
            cmd(1, 'subdomain').then(function () {
                done('deferred should not have been resolved');
            }, function (actual) {
                expect(speedboat.dropletGet).to.have.been.called.exactly(1);
                expect(speedboat.domainRecordGetAll).to.have.been.called.exactly(1);
                expect(speedboat.domainRecordDestroy).to.have.been.called.exactly(1);
                expect(speedboat.domainRecordNew).to.have.been.called.exactly(1);
                expect(actual).to.equal(expected);
                done();
            });
        });
    });

    describe('when all operations are successful', function () {
        describe('when no domain record exists for the droplet', function () {
            beforeEach(function (done) {
                droplet.ip_address = '111.222.333.444';
                done();
            });

            it('should not attempt to destroy one', function (done) {
                var cmd = registerDomainCmd(speedboat);
                cmd(1, 'subdomain').then(function () {
                    expect(speedboat.domainRecordDestroy).to.have.been.called.exactly(0);
                    done();
                }, function () {
                    done('deferred should not have been rejected');
                });
            });

            it('should resolve the deferred', function (done) {
                var cmd = registerDomainCmd(speedboat);
                cmd(1, 'subdomain').then(function () {
                    expect(speedboat.dropletGet).to.have.been.called.exactly(1);
                    expect(speedboat.domainRecordGetAll).to.have.been.called.exactly(1);
                    expect(speedboat.domainRecordDestroy).to.have.been.called.exactly(0);
                    expect(speedboat.domainRecordNew).to.have.been.called.exactly(1);
                    done();
                }, function () {
                    done('deferred should not have been rejected');
                });
            });
        });

        describe('when an existing domain record exists for the droplet', function () {
            it('should resolve the deferred', function (done) {
                var cmd = registerDomainCmd(speedboat);
                cmd(1, 'subdomain').then(function () {
                    expect(speedboat.dropletGet).to.have.been.called.exactly(1);
                    expect(speedboat.domainRecordGetAll).to.have.been.called.exactly(1);
                    expect(speedboat.domainRecordDestroy).to.have.been.called.exactly(1);
                    expect(speedboat.domainRecordNew).to.have.been.called.exactly(1);
                    done();
                }, function () {
                    done('deferred should not have been rejected');
                });
            });
        });
    });
});