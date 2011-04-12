
const remoteUtils = require('remote-utils');
const env = require("env");

exports.send = function(changes, callback) {
    var fileNames = [];
    var error_map = {};
    changes.added.forEach(function(item) {
        fileNames.push(item.name);
    });
    changes.modified.forEach(function(item) {
        fileNames.push(item.name);
    });
    var poster = remoteUtils.MultiPoster({
        url: 'http://localhost:6543/communities/default/files/new_upload_file.json',
        authHeader: 'Basic YWRtaW46YWRtaW4=',
        baseDir: env.base_dir,
        fileNames: fileNames,
        onComplete: function(json_results) {
            var results_map = {};
            env.log('finished uploads:', json_results.length);
            json_results.forEach(function(item, i) {
                results_map[fileNames[i]] = item; 
                if (item !== null) {
                    env.log('upload #', i, item.result, item.status, item.filename);
                } else {
                    // a network error.
                    env.log('upload #', i, "ERROR", fileNames[i]);
                }
            });
            var results = {added: [], modified: [], deleted: [], errors: []};
            changes.added.forEach(function(item) {
                if (results_map[item.name] !== null) {
                    results.added.push(item);
                } else {
                    results.errors.push(item);
                }
            });
            changes.modified.forEach(function(item) {
                if (results_map[item.name] !== null) {
                    results.modified.push(item);
                } else {
                    results.errors.push(item);
                }
            });
            if (callback) {
                callback(results);
            }
        }
    });
    poster.post();
};


