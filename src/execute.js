
/**
 * Main method which is called at the end of this file.
 * This is the main logic for the CLI script
 *
 * @param {Array} args The array of arguments passed to the CLI command
 * @return {void}
 */
function main(args) {

    var options = parseArgsAndOptions(args);

    // Argument audits
    if (!options.command) {
        showUsage();
        throw 'No command was specified';
    }
    if (options.command === '-h' || options.command === '--help') {
        showUsage();
        return;
    }
    if (!options.path) {
        showUsage();
        throw 'No project path was specified';
    }

    // The current deployer setup only allows for "deploy" as a valid command.
    // In the future, more complete lifecycle commands will be allowed based 
    // on the package.json `scripts` block.
    if (options.command !== 'deploy') {
        showUsage();
        throw 'That is not a valid command';
    }

    // TODO: 
    //  audit that path and package.json exist

    console.log('Executing command:', JSON.stringify(options));

    // TODO: call into the integrater

}

function parseArgsAndOptions(args) {
    var i, l,
        options = {
            command: null,
            path: null
        };

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
}

function showUsage() {
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


/* ******************** */
main(process.argv);
/* ******************** */