const data = require("self").data;
const file = require("file");

const env = require("env");


function WrappedFile(filename) {
    // Provide a "class" with a lot of the functionality enclosed,
    // to promote testing and clarity.

    // XXX This will later fail with subfolder support
    this.fullpath = file.join(env.base_dir, filename);
    this.fp = env.nsILocalFile;
    this.fp.initWithPath(this.fullpath);

    // Extract some data about this file
    this.last_modified = this.fp.lastModifiedTime;
}
WrappedFile.prototype.readEncoded = function () {
    // Read the contents into memory and base64 encode
    var wm = env.nsIWindowMediator;
    var win = wm.getMostRecentWindow('navigator:browser');

    var path = file.join(env.base_dir, file_name);
    var f = file.open(path, 'rb');
    return win.btoa(f.read());
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

        var local = new WrappedFile(name);

        var remote = remote_files[name];
        if (! remote) {
            // file added
            added.push({
                        name: name,
                        lastModified: local.last_modified,
                        wrappedFile: local
                    });
        } else {
            // Check if file modified
            if (local.last_modified > remote.lastModified) {
                modified.push({
                            name: name,
                            lastModified: local.last_modified,
                            wrappedFile: local
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

