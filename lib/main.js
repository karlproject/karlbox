const data = require('self').data;
const widgets = require('widget');
const panels = require("panel");
const notifications = require('notifications');
const simpleStorage = require('simple-storage');
const localChanges = require('local-changes');
const remoteChanges = require('remote-changes');
const timer = require('timer');
const {Cc,Ci,Cr} = require("chrome");

// Simple flag to know if the timer has been initialized.
// XXX replace this with more proper registration during
// add-on setup.
var timer_id = null;
var use_timer = false;

// XXX no windows yet
var dirService = Cc["@mozilla.org/file/directory_service;1"].
                     getService(Ci.nsIProperties);
var homeDirFile = dirService.get("Home", Ci.nsIFile);
var base_dir = homeDirFile.path + '/karlbox';

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
}

var kb_panel;

kb_panel = panels.Panel({
            width: 240,
            height: 320,
            contentURL: data.url("panel.html"),
            contentScriptFile: [
                data.url("jquery-1.5.1.min.js"),
                data.url("panel.js")
            ],
            contentScriptWhen: "ready",
            onMessage: function handleMessage(message) {
                switch (message.type) {
                    case 'trigger_sync': {
                        console.log('Panel says to do a manual sync');
                        refresh();
                        return;
                    }

                    case 'toggle_sync': {
                        // The panel wants us to toggle whether
                        // background sync is running
                        if (timer_id == null) {
                            console.log('turning on timer');
                            refresh();
                            timer_id = timer.setInterval(refresh, 5000);
                            kb_panel.postMessage({type: 'sync_on'});
                        } else {
                            console.log('turn off timer_id: ' + timer_id);
                            timer.clearInterval(timer_id);
                            timer_id = null;
                            kb_panel.postMessage({type: 'sync_off'});
                        }
                        return;
                    }
                }
            }
        });

function refresh() {

    var now = new Date();
    kb_panel.postMessage({type: 'last_update',
                value: now});

    // fetch the remote filelist from our memory now
    var remote_files = simpleStorage.storage.files;

    // detect the local changed
    changes = localChanges.detect(base_dir, remote_files);

    remoteChanges.send(base_dir, changes);

    // give some information to the user
    info_update(changes);

}


exports.main = function(options, callbacks) {

    var widget = widgets.Widget({
                id: 'karlbox-icon',
                label: "KARL",
                contentURL: data.url("karl.ico"),
                panel: kb_panel
            });

};

