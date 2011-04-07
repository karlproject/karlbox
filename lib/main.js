const data = require('self').data;
const widgets = require('widget');
const panels = require("panel");
const notifications = require('notifications');
const localChanges = require('local-changes');
const remoteChanges = require('remote-changes');
const timer = require('timer');
const badges = require("BadgedWidget");
const file = require("file");
const env = require("env");
var dbt = require("dashboard_tab");

var kb_widget, kb_panel;
var remote_files = [];

// Simple flag to know if the timer has been initialized.
// XXX replace this with more proper registration during
// add-on setup.
var timer_id = null;
var use_timer = false;

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
                        refresh();
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

function refresh() {

    kb_widget.badge = {
        text: '*',
        color: 'white',
        opacity: '0.5'
    };

    // detect the local changed
    changes = localChanges.detect(remote_files);

    remoteChanges.send(changes);


    // give some information to the user
    info_update(changes);

    var now = new Date();
    kb_panel.postMessage({type: 'last_update',
                value: now});

    kb_widget.badge = {};

}

exports.main = function(options, callbacks) {

    try {
        file.mkpath(env.base_dir);
    } catch (exc) {
        notifications.notify({
                    title: "ERROR in karlbox add-on",
                    text: exc.message,
                    iconURL: data.url("karl.ico")
                });
    }


    kb_widget = badges.BadgedWidget({
                id: 'karlbox-icon',
                label: "KARL",
                contentURL: data.url("karl.ico"),
                panel: kb_panel
            });
};

