'use strict';
var EventEmitter = require('events').EventEmitter;
var util = require('util');

function Countdown(millisecondInterval) {
	EventEmitter.call(this);
	var self = this;

	this.interval = Math.abs(millisecondInterval);
	this.startAt = 0;
	this.endAt = -1;

	setImmediate(function () {
		self.startAt = Date.now();
		self.emit('start');
		setTimeout(function () {
			self.endAt = Date.now();
			self.emit('end');
		}, self.interval);
	});
}

util.inherits(Countdown, EventEmitter);

module.exports = Countdown;