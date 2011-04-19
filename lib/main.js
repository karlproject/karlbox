
const data = require('self').data;
const env = require("env");
const widgets = require('widget');
const panels = require("panel");
const file = require("file");
const notifications = require('notifications');
const timer = require('timer');
const badges = require("BadgedWidget");
const SyncList = require('sync-manager').SyncList;
const LocalRoot = require('local-utils').LocalRoot;
const initSyncData = require('storage').initSyncData;
const storage = require('storage').storage;
var dbt = require("dashboard_tab");

var kb_widget, kb_panel;


var sync_data = storage.sync_data;
var preferences = storage.preferences;


// Simple flag to know if the timer has been initialized.
// XXX replace this with more proper registration during
// add-on setup.
var timer_id = null;
var use_timer = false;

function info_update(pullResults, pushResults, globalConflicts) {
    var pull_added = pullResults.added.length;
    var pull_modified = pullResults.modified.length;
    var pull_deleted = pullResults.deleted.length;
    var pull_errors = pullResults.errors.length;
    var pull_conflicts = pullResults.conflicts.length;
    var push_added = pushResults.added.length;
    var push_modified = pushResults.modified.length;
    var push_deleted = pushResults.deleted.length;
    var push_errors = pushResults.errors.length;
    var push_conflicts = pushResults.conflicts.length;
    var global_conflicts = globalConflicts.length;
    var title;
    var txt = '' + (push_added + push_modified) + ' files sent, ' +
        (pull_added + pull_modified) + ' files received, ' +
        push_deleted + ' files remotely removed, ' + 
        pull_deleted + ' files locally removed.'; 
    if (pull_conflicts + push_conflicts + global_conflicts > 0) {
        txt = '' + (pull_conflicts + push_conflicts + global_conflicts) + ' CONFLICTS, ' + txt;
    }
    if (pull_errors + push_errors == 0) {
        title = 'Synchronization successful';
    } else {
        title = 'Synchronization failed!';
        txt = '' + (pull_errors + push_errors) + ' ERRORS, ' + txt;
    }
    notifications.notify({
                title: title,
                text: txt,
                iconURL: data.url("karl.ico")
            });

    if (pull_conflicts + push_conflicts + global_conflicts > 0) {
        var conflict_fileNames = "";
        pullResults.conflicts.forEach(function(fileName) {
            conflict_fileNames += fileName + '\n';
        });
        pushResults.conflicts.forEach(function(fileName) {
            conflict_fileNames += fileName + '\n';
        });
        globalConflicts.forEach(function(fileName) {
            conflict_fileNames += fileName + '\n';
        });

        notifications.notify({
                    title: 'Local conflicts detected',
                    text: 'The following local files are in conflict. To resolve the conflicts you have' +
                          ' to remove these files locally and synchronize again.\n\n' + conflict_fileNames,
                    iconURL: data.url("karl.ico")
                });
    }
}

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
                        env.log('Panel says to do a manual sync');
                        if (! sl.locked) {
                            refresh();
                        } else {
                            // tell the user why it did not work
                            //
                            notifications.notify({
                                title: 'Sync is in progress',
                                text: 'Please repeat the synchronization later.',
                                iconURL: data.url("karl.ico")
                            });
                        }
                        return;
                    }

                    case 'toggle_sync': {
                        // The panel wants us to toggle whether
                        // background sync is running
                        if (timer_id == null) {
                            env.log('turning on timer');
                            refresh();
                            timer_id = timer.setInterval(refresh, 5000);
                            kb_panel.postMessage({type: 'sync_on'});
                        } else {
                            env.log('turn off timer_id: ' + timer_id);
                            timer.clearInterval(timer_id);
                            timer_id = null;
                            kb_panel.postMessage({type: 'sync_off'});
                        }
                        return;
                    }

                    case 'open_dashboard': {
                        // User clicked in panel to load dashboard
                        kb_panel.hide();
                        dbt.make_dashboard();
                    }
                }
            }
        });

function set_setup(message) {
    // Called from the dashboard
    env.log(message.username);
}

var sl = SyncList({
    syncData: sync_data,
    onComplete: function() {

        // Make some notifications with the results
        info_update(this.pullResults, this.pushResults, this.sync_statuses.conflict);

        // Update the panel with the date of the last update
        var now = new Date();
        kb_panel.postMessage({type: 'last_update',
                    value: now});

        kb_widget.badge = {};

    }
});

function refresh() {

    kb_widget.badge = {
        text: '*',
        color: 'white',
        opacity: '0.5'
    };
   
    // Only sync if another process is not in progress.
    if (! sl.locked) {

        if (preferences.lastlogin === undefined) {
            notifications.notify({
                title: 'Synchronization failed',
                text: 'You have to set your preferences first from the Dashboard.',
                iconURL: data.url('karl.ico')
            });
            return;
        }

        // changed any of the server settings?
        var baseFolderPath = 'communities/' + preferences.lastlogin.karlcommunity + '/files';
        var baseDir = file.join(env.homeDirPath, preferences.lastlogin.localdir);

        if (sl.options.baseUrl && sl.options.baseUrl != preferences.lastlogin.karlurl ||
            sl.options.baseFolderPath && sl.options.baseFolderPath != baseFolderPath ||
            sl.options.baseDir && sl.options.baseDir != baseDir
            ) {
            // clear our sync data 
            initSyncData();
            // ...and tell the manager that it changed
            sl.setOptions({
                syncData: storage.sync_data
            });
            /// ... and tell the user!
            notifications.notify({
                title: 'Synchronization data cleared',
                text: 'You changed the remote server in sync, so your sync data is reinitialized. ' +
                      'You may need to delete or remove your local sync directory!',
                iconURL: data.url("karl.ico")
            });
        }
        // check if the directory is created
        var localRoot = LocalRoot({
            baseDir: baseDir
        });

        if (localRoot.existsRoot()){
            // We have a root, it must belong to us
            if (! localRoot.checkRoot(storage.sync_data.hash)) {
                notifications.notify({
                    title: 'Synchronization failed',
                    text: 'There is already a local directory called "' + baseDir + '", ' +
                          'but it belongs to a different synchronization manager. ' +
                          'Delete or remove this directory, and repeat synchronization!',
                    iconURL: data.url("karl.ico")
                });
                return;
            }
        } else {
            // let's create it then
            // but also, clean the sync data first
            initSyncData();
            // ...and tell the manager that it changed
            sl.setOptions({
                syncData: storage.sync_data
            });
            // Finally, create that root dir
            localRoot.createRoot(storage.sync_data.hash);
        }

        // update the server options
        sl.setOptions({
            baseUrl: preferences.lastlogin.karlurl,
            baseFolderPath: baseFolderPath,
            username: preferences.lastlogin.username,
            password: preferences.lastlogin.password,
            baseDir: baseDir
        });
        
        // do the synchronization
        sl.sync();
    }
}

exports.main = function(options, callbacks) {

    kb_widget = badges.BadgedWidget({
                id: 'karlbox-icon',
                label: "KARL",
                contentURL: data.url("karl.ico"),
                panel: kb_panel
            });
};

