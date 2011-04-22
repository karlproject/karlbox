/*

 The mediator between the content script and the add-on

 */

const tabs = require("tabs");
const data = require('self').data;
const env = require("env");

const preferences = require('storage').storage.preferences;

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
    }
}

exports.make_dashboard = function () {
    // Make a tab for the dashboard and keep around the worker

    tabs.open({
                url: data.url("ka.html"),
                onReady: function (tab) {
                    exports.worker = tab.attach({
                                contentScriptFile: [
                                    data.url("lib/js/jquery-1.5.1.min.js"),
                                    data.url("lib/js/jquery-ui-1.8.11.custom.min.js"),
                                    data.url("karlapps.js"),
                                    data.url("ka.js"),
                                    data.url("dashboard.js")
                                ],
                                contentScript: 'postMessage({type: "fetch_setupdata"});',
                                onMessage: route_message
                            });
                    exports.this_tab = tab;
                }
            });

};

