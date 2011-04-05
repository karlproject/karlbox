
const remoteUtils = require('remote-utils');
const env = require("env");

exports.send = function(changes) {
    var fileNames = [];
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
            env.log('finished uploads:', json_results.length);
            json_results.forEach(function(item, i) {
                env.log('upload #', i, item.result, item.status, item.filename);
            })
        }
    });
    poster.post();
};


