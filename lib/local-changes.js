const data = require("self").data;
const file = require("file");

const env = require("env");

function LocalFile (path) {
    var file = env.nsILocalFile;
    file.initWithPath(path);
    return file;
}

exports.detect = function(remote_files) {
    // Create the base directory, if it does not exist.

    var content = file.list(env.base_dir);

    env.log('Checking content of directory', env.base_dir);

    var added = [];
    var modified = [];
    var deleted = [];

    // Compare the content with the stored content.
    content.forEach(function(name) {

        // Bail out on certain patters of files, e.g. .DS_Store
        // env.log("filename: " + name)

        // get the time when the file was last modified
        var f = LocalFile(file.join(env.base_dir, name));

        var lastModified = f.lastModifiedTime;
        var remote = remote_files[name];
        if (! remote) {
            // file added
            added.push({
                        name: name,
                        lastModified: lastModified
                    });
        } else {
            // Check if file modified
            if (lastModified > remote.lastModified) {
                modified.push({
                            name: name,
                            lastModified: lastModified
                        });
            }
        }
    });
    for (var name in remote_files) {
        if (remote_files.hasOwnProperty(name)) {
            if (content.indexOf(name) == -1) {
                // file deleted
                deleted.push({
                            name: name
                        });
            }
        }
    }

    // Now, process the differences.
    added.forEach(function(info) {
        env.log('Added:', info.name);
        remote_files[info.name] = info;
    });
    modified.forEach(function(info) {
        env.log('Modified:', info.name);
        remote_files[info.name] = info;
    });
    deleted.forEach(function(info) {
        env.log('Deleted:', info.name);
        delete remote_files[info.name];
    });

    return {
        added: added,
        modified: modified,
        deleted: deleted
    };
};

