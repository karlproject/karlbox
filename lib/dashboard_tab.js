/*

 The mediator between the content script and the add-on

 */

const tabs = require("tabs");
const data = require('self').data;
const env = require("env");
const storage = require("simple-storage").storage;
const passwords = require("passwords");

exports.this_tab = null;
exports.worker = null;

const default_url = 'http://localhost:6543/';

function route_message(message) {
    var mv = message.value;

    switch (message.type) {
        case 'fetch_setupdata': {
            // The user clicked "setup" making the form appear.  Let's
            // provide some data via a message.

            var karlurl = storage.karlurl ? storage.karlurl : default_url;
            var username;
            var password;

            require("passwords").search({
                        realm: karlurl,
                        onComplete: function (credentials) {
                            // credentials is an array of all credentials with a given `realm`.
                            if (credentials.length) {
                                env.log("\n\n@## " + credentials[0].username);
                                env.log("\n\n@## " + credentials[0].password);

                            }
                        }
                    });
            var setup = {username: username,
                password: password, karlurl: karlurl};
            var message = {type: "fill_setupdata", value: setup};
            exports.worker.postMessage(message);
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
                                    data.url("jquery-1.5.1.min.js"),
                                    data.url("dashboard.js")
                                ],
                                onMessage: route_message
                            });
                    exports.this_tab = tab;
                }
            });

};
