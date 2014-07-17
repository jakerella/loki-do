'use strict';
var MotorBoat = require('motorboat'),
	CommandError = require('./command/command-error');

function SpeedBoat(options) {
	MotorBoat.call(this, options);
}

SpeedBoat.prototype = Object.create(MotorBoat.prototype);
SpeedBoat.prototype.constructor = SpeedBoat;

SpeedBoat.prototype.plot = function (boxId, cmd, cb) {
	var self = this;
	var plot = function (cb) {
		console.log('running command:', cmd);
		self.runInstanceCommand(boxId, cmd, function (err, result) {
			if (err) {
				var error = new CommandError('unable to run command: ' + err.toString(), cmd);
				error.innerError = err;
				return cb(err);
			}
			cb(null, result);
		});
	};
	/*
	 * If we have a callback already, invoke the plot and
	 * let the callback handle the result
	 */
	if (cb) {
		return plot(cb);
	}
	/*
	 * If we don't have a callback, the plot will be used
	 * elsewhere (e.g., in an async.* method)
	 */
	return plot;
};

module.exports = SpeedBoat;