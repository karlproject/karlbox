
const data = require('self').data;
const widgets = require('widget');
const notifications = require('notifications');
const simpleStorage = require('simple-storage');
const localChanges = require('local-changes');

// XXX no windows yet
var base_dir = "/tmp/karlbox";

// initialize the storage
if (!simpleStorage.storage.files) {
    simpleStorage.storage.files = [];
}

function info_update(changes) {
    var nr_added = changes.added.length;
    var nr_deleted = changes.deleted.length;
    var nr_modified = changes.modified.length;
    var title = 'Remote update succesful';
    var txt = '' + (nr_added + nr_modified) + ' files sent, ' +
            nr_deleted + ' files removed.';
    notifications.notify({
        title: title,
        text: txt,
        iconURL: data.url("karl.ico")
    });
};

function refresh() {
    
    // fetch the remote filelist from our memory now
    var remote_files = simpleStorage.storage.files;
    
    // detect the local changed
    changes = localChanges.detect(base_dir, remote_files);

    // give some information to the user
    info_update(changes);

};


exports.main = function(options, callbacks) {

    var widget = widgets.Widget({
        label: "KARL",
        contentURL: data.url("karl.ico"),
        onClick: function() {
            refresh();
        }
    });

};

console.log("The add-on is running.");
