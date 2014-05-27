# TeamCity Express

## Description

This application runs on the primary TeamCity server. It is responsible for publicly hosting projects once they are successfully built by TeamCity.

## Installation

The `teamcity_express` folder should be placed in the following location: `/opt/teamcity_express`

When the server starts, it should automatically start the server by running:

```
cd /opt/teamcity_express; forever start index.js
```
