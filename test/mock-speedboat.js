'use strict';
var chai = require('chai'),
	spies = require('chai-spies'),
	Q = require('q');
chai.use(spies);

function addMethodSpy(mock, methodName, autoError) {
	var method = mock[methodName] = chai.spy(function () {
		method._args = Array.prototype.slice.call(arguments);
		// assume the last arg is the callback
		var cb = method._args[method._args.length - 1];
		if (method._resolveWith) {
			return cb(null, method._resolveWith);
		}
		return cb(method._rejectWith);
	});
	method._resolveWith = null;
	method._rejectWith = autoError ? new Error(methodName) : null;
}

function mockDecorator (speedboatMock) {
	/*
	 * Create a new mock or override methods on an
	 * existing mock
	 */
	var mock = (speedboatMock || {});

	addMethodSpy(mock, 'copyFolder', false);

	// (special callback logic)
	mock.plot = chai.spy(function (boxId, command, cb) {
		if (cb) {
			return cb(mock.plot._rejectWith);
		}
		return function (cb) {
			return cb(mock.plot._rejectWith);
		};
	});
	mock.plot._rejectWith = null;

	addMethodSpy(mock, 'getDropletByName');

	addMethodSpy(mock, 'provision');

	addMethodSpy(mock, 'runInstanceCommand');

	addMethodSpy(mock, 'dropletGet');

	addMethodSpy(mock, 'domainRecordGetAll');

	addMethodSpy(mock, 'domainRecordDestroy', false);

	addMethodSpy(mock, 'domainRecordNew', false);

	addMethodSpy(mock, 'purgeKnownHost', false);

	return mock;
}

module.exports = mockDecorator;