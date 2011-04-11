/*

 The mediator between the content script and the add-on

 */

const storage = require("simple-storage").storage;

function get_lastlogin () {
    // For now, we store the login in simple-storage, unencoded,
    // like this:
    // storage.lastlogin = {
    //   karlurl: 'someurl', username: v1, password: v2
    // }
    // TODO storing unencrypted passwords is a no-no

    // Initialize if needed
    if (!storage.lastlogin) storage.lastlogin = {};

    return storage.lastlogin //sl[karlurl] ? sl[karlurl] : null
}
exports.get_lastlogin = get_lastlogin;

function set_lastlogin (karlurl, username, password) {

    // Initialize if needed
    if (!storage.lastlogin) storage.lastlogin = {};

    storage.lastlogin = {
        karlurl: karlurl,
        username: username,
        password: password
    }

    return
}
exports.set_lastlogin = set_lastlogin;




const tabs = require("tabs");
const data = require('self').data;
const env = require("env");
const passwords = require("passwords");

exports.this_tab = null;
exports.worker = null;

const default_url = 'http://localhost:6543/';



function fetch_setupdata(msg_value) {
    // The user clicked "setup" making the form appear.  Let's
    // provide some data via a message.

    var karlurl = storage.karlurl ? storage.karlurl : default_url;

    require("passwords").search({
                realm: karlurl,
                onComplete: function (credentials) {
                    // credentials is an array of all credentials with a given `realm`.
                    if (credentials.length) {
                        env.log("\n\n@## " + credentials[0].username);
                        env.log("\n\n@## " + credentials[0].password);
                        var setup = {
                            username: credentials[0].username,
                            password: credentials[0].password,
                            karlurl: karlurl
                        };
                        var message = {type: "fill_setupdata", value: setup};
                        exports.worker.postMessage(message);
                        return;

                    }
                }
            });
}

function route_message(message) {
    var mv = message.value;

    switch (message.type) {
        case 'fetch_setupdata': {
            fetch_setupdata(message.value);
            return;
        }
        case 'store_setupdata': {
            passwords.store({
                        realm: mv.karlurl,
                        username: mv.username,
                        password: mv.password,
                        onComplete: function () {
                            //
                        }
                    })
            env.log("\n\n## " + mv.username);

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
                                    data.url("jquery-1.4.4.js"),
                                    data.url("dashboard.js")
                                ],
                                onMessage: route_message
                            });
                    exports.this_tab = tab;
                }
            });

};
