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
    if (!preferences.lastlogin) preferences.lastlogin = {};

    return preferences.lastlogin;
}
exports.get_lastlogin = get_lastlogin;

function set_lastlogin(karlurl, username, password) {

    // Initialize if needed
    if (!preferences.lastlogin) preferences.lastlogin = {};

    preferences.lastlogin = {
        karlurl: karlurl,
        username: username,
        password: password
    }
}
exports.set_lastlogin = set_lastlogin;


exports.this_tab = null;
exports.worker = null;

const default_url = 'http://localhost:6543/';


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
            set_lastlogin(mv.karlurl, mv.username, mv.password);

            var message = {type: "finish_storesetup"};
            exports.worker.postMessage(message);
            return;
        }
    }
}

exports.make_dashboard = function () {
    // Make a tab for the dashboard and keep around the worker

    tabs.open({
                url: data.url("dashboard.html"),
                onReady: function (tab) {
                    exports.worker = tab.attach({
                                contentScriptFile: [
                                    data.url("jquery-1.5.1.min.js"),
                                    data.url("dashboard.js")
                                ],
                                onMessage: route_message
                            });
                    exports.this_tab = tab;
                }
            });

};

