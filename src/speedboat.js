'use strict';
var MotorBoat = require('motorboat'),
	CommandError = require('./command/command-error');

function SpeedBoat(options) {
	MotorBoat.call(this, options);
}

SpeedBoat.prototype = Object.create(MotorBoat.prototype);
SpeedBoat.prototype.constructor = SpeedBoat;

SpeedBoat.prototype.plot = function (boxId, cmd) {
	var self = this;
	return function (cb) {
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
};

module.exports = SpeedBoat;