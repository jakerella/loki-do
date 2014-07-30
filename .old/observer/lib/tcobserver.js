/**
 * @obsolete
 */

var _ = require('underscore'),
    nconf = require('nconf'),
    winston = require('winston'),
    TCListener = require('./tclistener'),
    TCDeployer = require('./tcdeployer'),
    MicroEvent = require('microevent');

var TCObserver = function() {
    this.init.apply(this, arguments);
};

_.extend(TCObserver.prototype, {

    'init': function(options) {
        this._initConfig(options.config);
        this._initLogger();
        this._initDeployer();
        this._initListener();
    },

    '_initListener': function() {
        var self = this;
        this.listener = new TCListener();
        this.listener.bind('new_build', function(dir, options) {
            self.deployer.deploy(dir, options);
        });
        this.listener.bind('log', function(cat, subject, meta) {
            self.logger.log(cat, subject, meta);
        });
    },

    '_initDeployer': function() {
        var self = this;
        this.deployer = new TCDeployer();
        this.deployer.bind('log', function(cat, subject, meta) {
            self.logger.log(cat, subject, meta);
        });
    },

    '_initConfig': function(path) {
        nconf.argv().env().file({
            'file': path
        });
    },

    '_initLogger': function() {
        this.logger = new(winston.Logger)({
            'transports': [
                new (winston.transports.File)({
                    'filename': nconf.get('log_file') || '/tmp/tcobserver.log'
                })
            ]
        });
    }

});

MicroEvent.mixin(TCObserver);

module.exports = TCObserver;
