/* jshint node: true */
'use strict';

// Dependencies
var fs = require('fs'),
	path = require('path'),
	fileToJSON = require('./file-to-json'),
	SpeedBoat = require('./speedboat'),
	deployCmd = require('./command/deploy'),
	EOL = require('os').EOL;

var IS_EXECUTING = (require.main === module);

var mod = {
	MAX_OPTION_ERROR: 99, // the maximum error code for option/argument errors

	/**
	 * Main method which is called at the end of this file.
	 * This is the main logic for the CLI script
	 *
	 * @param {Array} args The array of arguments passed to the CLI command
	 * @return {Promise}
	 */
	main: function (args) {

		var pkgFile,
			self = this,
			options = mod.parseArgsAndOptions(args);

		// Argument audits
		if (!options.command) {
			self.exit(10, new Error('No command was specified'));
		}
		if (options.command === '-h' || options.command === '--help') {
			self.showUsage();
			return;
		}
		if (!options.path) {
			self.exit(15, new Error('No project path was specified'));
		}

		// Check the project path and package.json file
		options.path = path.resolve(options.path);
		pkgFile = path.join(options.path, 'package.json');

		if (!fs.existsSync(pkgFile)) {
			self.exit(20, new Error('There is no package.json file in that project path! (' + options.path + ')'));
		}

		// The current deployer setup only allows for "deploy" as a valid command.
		// In the future, more complete lifecycle commands will be allowed based 
		// on the package.json `scripts` block.
		if (options.command !== 'deploy') {
			self.exit(25, new Error('That is not a valid command'));
		}

		if (!options.doconfig) {
			self.exit(30, new Error('cloud configuration path not specified'));
		}

		var doConfigPath = path.resolve(__dirname, options.doconfig);

		if (!fs.existsSync(doConfigPath)) {
			self.exit(35, new Error('cloud configuration path does not exist'));
		}

		console.log('Executing command:', JSON.stringify(options));

		var doConfig;
		try {
			doConfig = fileToJSON(doConfigPath);
		} catch (e) {
			mod.showUsage();
			self.exit(40, new Error('cloud configuration file is not valid JSON'));
		}

		var speedboat = new SpeedBoat({
			client_id: doConfig.client_id,
			api_key: doConfig.api_key,
			ssh_key_id: doConfig.ssh_key_id,
			public_ssh_key: doConfig.public_ssh_key,
			private_ssh_key: doConfig.private_ssh_key,
			enable_logging: doConfig.enable_logging
		});
		
		var deploy = deployCmd(speedboat);
		return deploy.then(function (data) {
			console.log('deployment finished:');
			console.log(data);
			self.exit(0);
		}, function (err) {
			self.exit(100, err);
		});
	},

	/**
	 * Parses out the arguments and options from an array of strings
	 * (most likely from process.argv, but not necessarily)
	 * 
	 * @param  {Array} args An array of arguments, either simple strings, or in --name=value format
	 * @return {Object}	A hash of the options, included required things like "command" and "path"
	 */
	parseArgsAndOptions: function (args) {
		var i, l,
			options = {
				command: null,
				path: null
			};

		if (!args || args.length < 3) {
			return options;
		}

		if (args[2]) {
			options.command = args[2];
		}

		if (args[3]) {
			options.path = args[3];
		}

		if (args.length > 4) {
			for (i = 4, l = args.length; i < l; ++i) {
				var parts = args[i].match(/^\-\-([^=]+)(?:=(.+))?$/);
				if (parts) {
					options[parts[1]] = (parts[2] || true);
				}
			}
		}

		return options;
	},

	/**
	 * Shows the help information
	 * 
	 * @return {void}
	 */
	showUsage: function () {
		console.log([
			"",
			"  USAGE: node execute.js {command} {project-path} [--option=[value], ...]",
			"",
			"  This script is used to run commands on a deployment server. The ",
			"  intent is to allow for a bridge between the CI server and the ",
			"  deployment server.",
			"",
			"  Commands",
			"    deploy        Currently the only command, deploys project to server",
			"",
			"  Arguments",
			"    command       What to run on the remote server (see 'Commands' above)",
			"    project-path  Path to the project on the CI server (not remote server);",
			"                 must have a package.json file at that location",
			"    doconfig      Path to the Digital Ocean configuration file (JSON)",
			"",
			"  Options",
			"    --subdomain   The subdomain to use for the remote server deployment",
			"    --help        Show this usage information"
		].join(EOL));
	},

	/**
	 * Exists the process with the appropriate error code if
	 * running as a CLI script.
	 * 
	 * @param {Number} errorCode The code to exit the process with
	 * @param {String} errorOrMessage Either an Error object, or the string error message
	 * @return {void}
	 */
	exit: function (errorCode, errorOrMessage) {
		if (!errorOrMessage || !(errorOrMessage instanceof Error)) {
			errorOrMessage = new Error(errorOrMessage || 'Unexpected error');
			errorOrMessage.code = errorCode;
		}

		if (errorCode > 0 && errorCode <= this.MAX_OPTION_ERROR) {
			this.showUsage();
		}

		if (IS_EXECUTING) {
			console.error(errorOrMessage);
			process.exit(errorCode);

		} else if (errorCode !== 0) {
			throw errorOrMessage;
		}
	}
};


/* ********************************************************* */
/*     Kicks off the process if it is a CLI command call     */
/* ********************************************************* */
if (IS_EXECUTING) {
	mod.main(process.argv);
} else {
	module.exports = function (_deployCmd_, _fileToJSON_, _SpeedBoat_) {
		deployCmd = _deployCmd_ || deployCmd;
		fileToJSON = _fileToJSON_ || fileToJSON;
		SpeedBoat = _SpeedBoat_ || SpeedBoat;
		return mod;
	};
}
