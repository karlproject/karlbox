const page_worker = require("page-worker");
const data = require('self').data;

function get_dashboard() {
    // Utility to load the dashboard as a page worker

    var dashboard = page_worker.Page({
                contentURL: data.url("dashboard.html"),
                contentScriptFile: [
                    data.url("jquery-1.5.1.min.js"),
                    data.url("panel.js")
                ],                contentScriptWhen: "ready",
                onMessage: function(message) {
                    console.log(message);
                }
            });
    return dashboard;
}

exports.test_test_run = function(test) {
    test.pass('Unit test running!');
};

exports.test_test_load_worker = function(test) {

    var dashboard = get_dashboard();
    test.assert(page_worker);
};

