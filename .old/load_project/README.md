# load_project

## Description

This script is automatically invoked by TeamCity build agents after a successful build process. It gets called via the command line like so:

```
load_project /absolute/path/to/checked/out/project mysubdomain
```

The script sends a message to the Express server that is running on the same box. The message notifies the Express server that a new build is available and provides the following information:

* The absolute path to the newly checked out files
* The desired subdomain for this build (specified via TeamCity configuration settings for the project)

## Installation

The `load_project` script should be placed in `/usr/bin` and given execution rights (`chmod +x load_script`).

