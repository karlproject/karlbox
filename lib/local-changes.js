

const data = require('self').data;
const notifications = require('notifications');
const file = require('file');

function fatal_error(txt) {
    notifications.notify({
        title: "ERROR in karlbox add-on",
        text: txt,
        iconURL: data.url("karl.ico")
    });
}

exports.detect = function(base_dir, remote_filelist) {
    // Create the base directory, if it does not exist.
    try {
        file.mkpath(base_dir);
    } catch (exc) {
        fatal_error(exc.message);
    }

    var content = file.list(base_dir);

    console.log('Checking content of directory', base_dir);

    var added = [];
    var deleted = [];
    var modified = [];

    // Compare the content with the stored content.
    content.forEach(function(elem) {
        if (remote_filelist.indexOf(elem) == -1) {
            added.push(elem);
        } 
    });
    remote_filelist.forEach(function(elem) {
        if (content.indexOf(elem) == -1) {
            deleted.push(elem);
        } 
    });

    // XXX modifications not detected yet...

    // Now, process the differences.
    added.forEach(function(elem) {
        console.log('Added:', elem);
        remote_filelist.push(elem);
    });
    deleted.forEach(function(elem) {
        console.log('Deleted:', elem);
        remote_filelist.splice(remote_filelist.indexOf(elem), 1);
    });

    return {
        added: added, 
        deleted: deleted, 
        modified: modified
    };
};


