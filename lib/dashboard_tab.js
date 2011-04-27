/*

 The mediator between the content script and the add-on

 */

const tabs = require("tabs");
const data = require('self').data;
const env = require("env");
const main = require("main");
const notifications = require("notifications");
const timer = require('timer');
const file = require('file');
const LocalRoot = require('local-utils').LocalRoot;

const preferences = require('storage').storage.preferences;

// Simple flag to know if the timer has been initialized.
// XXX replace this with more proper registration during
// add-on setup.
var timer_id = null;
var use_timer = false;

function get_lastlogin() {
    // For now, we store the login in simple-storage, unencoded,
    // like this:
    // storage.preferences.lastlogin = {
    //   karlurl: 'someurl', username: v1, password: v2
    // }
    // TODO storing unencrypted passwords is a no-no

    // Initialize if needed
    if (!preferences.lastlogin) {
        // set defaults
        preferences.lastlogin = {
            karlurl: 'https://karlstaging.gocept.com/branch1/karlbox/',
            karlcommunity: 'default',
            localdir: 'karlbox'
        };
    }

    return preferences.lastlogin;
}
exports.get_lastlogin = get_lastlogin;

function set_lastlogin(options) {

    // Initialize if needed
    get_lastlogin();

    preferences.lastlogin = {
        karlurl: options.karlurl,
        karlcommunity: options.karlcommunity,
        username: options.username,
        password: options.password,
        localdir: options.localdir
    }
}
exports.set_lastlogin = set_lastlogin;


exports.this_tab = null;
exports.worker = null;

var syncFileName = "agility.json";

function route_message(message) {
    var mv = message.value;

    switch (message.type) {
        case 'fetch_setupdata': {
            var message = {
                type: "fill_setupdata",
                value: get_lastlogin()
            };
            exports.worker.postMessage(message);
            return;
        }

        case 'store_setupdata': {
            set_lastlogin({
                        karlurl: mv.karlurl,
                        karlcommunity: mv.karlcommunity,
                        username: mv.username,
                        password: mv.password,
                        localdir: mv.localdir
                    });

            var message = {type: "finish_storesetup"};
            exports.worker.postMessage(message);
            return;
        }

        case 'trigger_sync': {
            env.log('Panel says to do a manual sync');
            if (! main.sl.locked) {
                main.refresh({manual: true});
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
                main.refresh({manual: false});
                timer_id = timer.setInterval(function() {
                    main.refresh({manual: false});
                }, 5000);
                exports.worker.postMessage({type: 'sync_on'});
            } else {
                env.log('turn off timer_id: ' + timer_id);
                timer.clearInterval(timer_id);
                timer_id = null;
                exports.worker.postMessage({type: 'sync_off'});
            }
            return;
        }

        case 'save_sync': {
            var baseDir = file.join(env.homeDirPath, preferences.lastlogin.localdir);
            var lr = LocalRoot({baseDir: baseDir});
            lr.writeFile(syncFileName, mv);
            env.log('agility.json SAVED');
            return;
        }

        case 'load_sync': {
            var baseDir = file.join(env.homeDirPath, preferences.lastlogin.localdir);
            var lr = LocalRoot({baseDir: baseDir});
            var txt = lr.readFile(syncFileName);
            exports.worker.postMessage({type: 'load_sync_finish', value: txt});
            env.log('agility.json LOADED');
            return;
        }


    }
}

exports.make_dashboard = function () {
    // Make a tab for the dashboard and keep around the worker

    tabs.open({
                url: data.url("ka.html"),
                onReady: function (tab) {
                    exports.worker = tab.attach({
                                contentScriptFile: [
                                    //data.url("lib/js/jquery-1.5.1.min.js"),
                                    //data.url("lib/js/jquery-ui-1.8.11.custom.min.js"),
                                    data.url("dashboard.js")
                                ],
                                onMessage: route_message
                            });
                    exports.this_tab = tab;
                    var message = {
                        type: "fill_setupdata",
                        value: get_lastlogin()
                    };
                    exports.worker.postMessage(message);
                }
            });

};

