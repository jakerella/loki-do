'use strict';
var EventEmitter = require('events').EventEmitter;
var util = require('util');

function Countdown(millisecondInterval) {
	EventEmitter.call(this);
	var self = this;

	this.interval = millisecondInterval;
	this.then = Date.now();

	function tick() {
		self.now = Date.now();
		if ((self.now - self.then) >= self.interval) {
			return self.emit('end');
		}
		process.nextTick(tick);
	}

	process.nextTick(function () {
		self.emit('start');
		tick();
	});
}

util.inherits(Countdown, EventEmitter);

module.exports = Countdown;