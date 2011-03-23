const data = require('self').data;
const notifications = require('notifications');
const file = require('file');
const chrome = require('chrome');
const {Cc,Ci,Cr} = require("chrome");
var Request = require('request').Request;


function MozFile(path) {
    var file = Cc['@mozilla.org/file/local;1']
            .createInstance(Ci.nsILocalFile);
    file.initWithPath(path);
    return file;
}


function post_file() {

    var content = {title: 'From karlbox', __formish_form__: 'save',
        security_state: 'inherits', submit: 'xy'};

    var url = 'http://localhost:6543/communities/default/files/add_folder.html';
    var karl = Request({
                url: url,
                content: content,
                headers: {Authorization: 'Basic YWRtaW46YWRtaW4='},
                onComplete: function (response) {
                    console.log('finished: ' + response.text)
                }
            });
    karl.post();
}


function fatal_error(txt) {
    notifications.notify({
                title: "ERROR in karlbox add-on",
                text: txt,
                iconURL: data.url("karl.ico")
            });
}

exports.detect = function(base_dir, remote_files) {
    // Create the base directory, if it does not exist.
    try {
        file.mkpath(base_dir);
    } catch (exc) {
        fatal_error(exc.message);
    }

    var content = file.list(base_dir);

    console.log('Checking content of directory', base_dir);

    var added = [];
    var modified = [];
    var deleted = [];

    // Compare the content with the stored content.
    content.forEach(function(name) {
        // get the time when the file was last modified
        var f = MozFile(file.join(base_dir, name));
        var lastModified = f.lastModifiedTime;
        var remote = remote_files[name];
        if (! remote) {
            // file added
            post_file(); // XXX Paul hack to send data to server
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
        console.log('Added:', info.name);
        remote_files[info.name] = info;
    });
    modified.forEach(function(info) {
        console.log('Modified:', info.name);
        remote_files[info.name] = info;
    });
    deleted.forEach(function(info) {
        console.log('Deleted:', info.name);
        delete remote_files[info.name];
    });

    return {
        added: added,
        modified: modified,
        deleted: deleted
    };
};

