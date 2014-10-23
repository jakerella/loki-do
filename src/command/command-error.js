'use strict';

function CommandError(message, cmd) {
    var err = Error.apply(this, [message]);
    this.name = 'CommandError';
    this.cmd = cmd || '';
    this.innerError = null;
    this.message = err.message;
    this.stack = err.stack;
    return this;
}

CommandError.prototype = Object.create(Error.prototype, {
    constructor: { value: CommandError }
});

module.exports = CommandError;