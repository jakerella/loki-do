'use strict';

function CommandError(message, cmd) {
	Error.call(this, message);
	this.name = 'CommandError';
	this.cmd = cmd || '';
	this.innerError = null;
	Error.captureStackTrace(this, this.constructor);
}

CommandError.prototype = Object.create(Error.prototype);
CommandError.prototype.constructor = CommandError;

module.exports = CommandError;