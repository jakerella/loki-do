'use strict';
var fs = require('fs');

module.exports = function fileToJSON (filePath, cb) {
    var json, err;

    try {
        var buffer = fs.readFileSync(filePath);
        json = JSON.parse(buffer.toString());
    } catch (e) {
        // synchronous error
        if (!cb) {
            throw e;
        }
        err = e;
    }

    // asynchronous error
    if (err) {
        return cb(err);
    }

    // asynchronous result
    if (cb) {
        return cb(null, json);
    }

    // synchronous result
    return json;
};