/* jshint node: true */
'use strict';

// Dependencies
var fs = require('fs'),
	path = require('path'),
	fileToJSON = require('./file-to-json'),
	SpeedBoat = require('./speedboat'),
	runNpmCmd = require('./command/npm-command'),
	EOL = require('os').EOL,

	COMMANDS = {
		// any custom command (not simply npm [command]) should be a 
		// `require()` statement that returns a  function to call which 
		// accepts an options block.
		help: {},
		provision: require('./command/provision'),
		stop: { cwd: 'destination' },
		test: { cwd: 'temp' },
		deploy: { cwd: 'destination' },
		prestart: { cwd: 'destination' },
		start: { cwd: 'destination' }
	};

// Constants
var IS_EXECUTING = (require.main === module);


var mod = {
	MIN_OPTION_ERROR: 100,
	MAX_OPTION_ERROR: 199,

	/**
	 * Main method which is called at the end of this file.
	 * This is the main logic for the CLI script
	 *
	 * @param {Array} args The array of arguments passed to the CLI command
	 * @return {Promise}
	 */
	main: function (args) {

		var runNpm, cmd, cwd,
			self = this,
			options = mod.parseArgsAndOptions(args);

		options = self.auditArgsAndOptions(options);		

		if (options.command === 'help') {
			// If the command is the help option (or shortened version)
			// then we don't want to do anything else, including auditing
			// other options
			self.showUsage();
			self.exit(0);
			return;
		}

		console.log('Executing command:', JSON.stringify(options));

		var speedboat = new SpeedBoat({
			client_id: options.configObject.digital_ocean.client_id,
			api_key: options.configObject.digital_ocean.api_key,
			ssh_key_id: options.configObject.digital_ocean.ssh_key_id,
			public_ssh_key: options.configObject.digital_ocean.public_ssh_key,
			private_ssh_key: options.configObject.digital_ocean.private_ssh_key,
			enable_logging: options.configObject.digital_ocean.enable_logging,
            scripts_path: options.configObject.digital_ocean.scripts_path
		});

		runNpm = runNpmCmd(speedboat);
		
		if (typeof COMMANDS[options.command] === 'function') {
			cmd = COMMANDS[options.command](speedboat);
			return cmd(options).then(
				function (results) {
					console.log('Command finished (' + options.command + '):');
					console.log(results);
					self.exit(0);
				},
				function (err) {
					self.exit(17, err);
				}
			);
		} else if (COMMANDS[options.command]) {
			cwd = options.configObject[COMMANDS[options.command].cwd] || null;
			return runNpm(options, cwd).then(
				function (results) {
					console.log('Command finished (npm ' + options.command + '):');
					console.log(results);
					self.exit(0);
				},
				function (err) {
					self.exit(13, err);
				}
			);

		}
	},

	/**
	 * Parses out the arguments and options from an array of strings
	 * (most likely from process.argv, but not necessarily)
	 * 
	 * @param  {Array} args An array of arguments, either simple strings, or in --name=value format
	 * @return {Object}	A hash of the options, included required things like "command" and "vcsurl"
	 */
	parseArgsAndOptions: function (args) {
		var i, l,
			options = {
				command: null,
				vcsurl: null,
				subdomain: null,
				config: null,
				configObject: {}
			};

		if (!args || args.length < 3) {
			return options;
		}

		if (args[2]) {
			options.command = args[2];
		}
		if (args[3]) {
			options.vcsurl = args[3];
		}
		if (args[4]) {
			options.subdomain = args[4];
		}
		if (args[5]) {
			options.config = args[5];
		}

		if (args.length > 6) {
			for (i = 6, l = args.length; i < l; ++i) {
				var parts = args[i].match(/^\-\-([^=]+)(?:=(.+))?$/);
				if (parts) {
					options[parts[1]] = (parts[2] || true);
				}
			}
		}

		return options;
	},

	/**
	 * Audits all arguments and checks for proper file paths, etc.
	 * 
	 * @param  {Object} options The hash of all arguments and options
	 * @throws {Error}          Throws error on any argument/option failure
	 * @return {Object}         The options to use, including any changes (typically just resolution of paths and pulling in of JSON)
	 */
	auditArgsAndOptions: function(options) {
		var pkgFile, configPath,
			self = this;

		options = options || {};

		if (!options.command) {
			self.exit(100, new Error('No command was specified'));
		}
		if (options.command === '-h' || options.command === '--help') {
			// If the command is the help option (or shortened version)
			// then we don't want to do anything else, including auditing
			// other options
			return { command: 'help' };
		}
		if (!COMMANDS[options.command]) {
			self.exit(105, new Error('That is not a valid command'));
		}

		if (!options.vcsurl) {
			self.exit(110, new Error('No project version control was specified'));
		}

		if (!options.subdomain) {
			self.exit(120, new Error('No project subdomain was specified'));
		}

		if (!options.config) {
			self.exit(130, new Error('Configuration object path not specified'));
		}

		configPath = path.resolve(__dirname, options.config);

		if (!fs.existsSync(configPath)) {
			self.exit(133, new Error('Configuration object path does not exist'));
		}

		try {
			options.configObject = fileToJSON(configPath);
		} catch (e) {
			self.exit(136, new Error('Configuration object file is not valid JSON'));
		}

		if (!options.configObject.digital_ocean) {
			self.exit(136, new Error('Configuration object does not contain a "digital_ocean" block'));
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
			"  USAGE: node execute.js {command} {vcs-url} {subdomain} {config} [--option=[value], ...]",
			"",
			"  This script is used to run commands on a remote deployment server. The",
			"  intent is to allow for a bridge between the CI server and the deployment",
			"  server and to run certain commands during the testing and deployment",
			"  process. With the exception of 'provision', all commands here simply map",
			"  to the 'scripts' block of the project's package.json file. In other words",
			"  running the 'test' command here will simply execute 'npm test' within the",
			"  target project on the destination server.",
			"",
			"  For example, the 'start' command here should be accompanied by a 'start'",
			"  line in your 'scripts' block within package.json:",
			"  {",
			"    ...,",
			"    \"scripts\": {",
			"      \"start\": \"forever start node_modules/static-server/server.js --options\",",
			"      ...",
			"    }",
			"  }",
			"",
			"  Commands",
			"    help          Show this usage information",
			"    provision     Create a new server (if required) and run any provisioning",
			"                  scripts. If the server already exists, nothing happens.",
			"                  Note that this command requires the 'subdomain' option!",
			"                  configuration block (currently 'digitial_ocean')",
			"                  NOTE: 'provision' will also checkout your project code",
			"                        from source control, then run 'npm provision' if this",
			"                        is a new server",
			"    test          Execute the 'test' command of package.json 'scripts' block",
			"    stop          Execute the 'stop' command of package.json 'scripts' block",
			"    deploy        This commmand copies the project files from the temporary",
			"                  location to the destination at which point the `deploy`",
			"                  command in the package.json 'scripts' block is run",
			"                  NOTE: The application should be stopped BEFORE this command",
			"                        is run!",
			"    prestart      Execute the 'prestart' command of package.json 'scripts' block",
			"                  NOTE: you should probably NOT use this command. It will be",
			"                        run automatically before any 'start' command!",
			"    start         Execute the 'start' command of package.json 'scripts' block",
			"                  NOTE: the 'prestart' command in the 'scripts' block will",
			"                        always run BEFORE this command.",
			"",
			"  Arguments (REQUIRED)",
			"    command       What to run on the remote server (see 'Commands' above)",
			"    vcs-url       URL to the repository in the version control system",
			"                  NOTE: You must have a package.json file in that root!",
			"                        Also, currently `git` is the only supported system.",
			"    subdomain     The subdomain to use for the remote server deployment",
			"    config        Path to the configuration object file (JSON), should include",
            "                  cloud deployment config.",
            "                  NOTE: this is NOT the config for the target project, but for",
            "                        the CI scripts and destination cloud systems as a whole.",
			"",
			"  Options",
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

		if (errorCode >= this.MIN_OPTION_ERROR && errorCode <= this.MAX_OPTION_ERROR) {
			// If the error occurred in the options, then show usage
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
	module.exports = function (_runNpmCmd_, _provisionCmd_, _fileToJSON_, _SpeedBoat_) {
		runNpmCmd = _runNpmCmd_ || runNpmCmd;
		COMMANDS.provision = _provisionCmd_ || COMMANDS.provision || false;
		fileToJSON = _fileToJSON_ || fileToJSON;
		SpeedBoat = _SpeedBoat_ || SpeedBoat;
		return mod;
	};
}
