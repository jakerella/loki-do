
// Dependencies
var fs = require('fs');

var methods = {

    /**
     * Main method which is called at the end of this file.
     * This is the main logic for the CLI script
     *
     * @param {Array} args The array of arguments passed to the CLI command
     * @return {void}
     */
    main: function (args) {

        var options = methods.parseArgsAndOptions(args);

        // Argument audits
        if (!options.command) {
            methods.showUsage();
            throw Error('No command was specified');
        }
        if (options.command === '-h' || options.command === '--help') {
            methods.showUsage();
            return;
        }
        if (!options.path) {
            methods.showUsage();
            throw Error('No project path was specified');
        }

        // The current deployer setup only allows for "deploy" as a valid command.
        // In the future, more complete lifecycle commands will be allowed based 
        // on the package.json `scripts` block.
        if (options.command !== 'deploy') {
            methods.showUsage();
            throw Error('That is not a valid command');
        }

        // TODO: 
        //  audit that path and package.json exist

        console.log('Executing command:', JSON.stringify(options));

        // TODO: call into the integrater

    },

    /**
     * Parses out the arguments and options from an array of strings
     * (most likely from process.argv, but not necessarily)
     * 
     * @param  {[type]} args [description]
     * @return {[type]}      [description]
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

    showUsage: function () {
        console.log(
            "Usage: node execute.js {command} {project-path} [--option=[value], ...]\n" +
            "    This script is used to run commands on a deployment server. The \n" +
            "    intent is to allow for a bridge between the CI server and the \n" +
            "    deployment server.\n" + 
            "\n" +
            "  Commands\n" + 
            "    deploy     Currently the only command, deploys project to server\n" +
            "\n" +
            "  Arguments\n" +
            "    command       What to run on the remote server (see 'Commands' above)\n" +
            "    project-path  Path to the project on the CI server (not remote server)\n" +
            "\n" +
            "  Options\n" +
            "    --subdomain   The subdomain to use for the remote server deployment\n" +
            "    --help        Show this usage information\n"
        );
    }
};


/* ********************************************************* */
/*     Kicks off the process if it is a CLI command call     */
/* ********************************************************* */
if (require.main === module) {
    methods.main(process.argv);
} else {
    module.exports = methods;
}
