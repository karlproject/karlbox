const env = require("env");
var dbt = require("dashboard_tab");
const tabs = require("tabs");
const data = require('self').data;
const storage = require("simple-storage").storage;

const karlurl = "http://localhost:6543/";
const fakeuser = "someusername";
const fakepasswd = "somepassword";

// like setTimeout
function timeout(delay, func) {
    var timer = env.cc['@mozilla.org/timer;1']
            .createInstance(env.ci.nsITimer);
    timer.initWithCallback(func, delay,
            env.ci.nsITimer.TYPE_ONE_SHOT);
    return timer;
}

function run_worker(this_cs, this_f) {
    timeout(50, function () {
        var worker = dbt.this_tab.attach({
                    contentScriptFile: [
                        data.url("jquery-1.4.4.js"),
                        data.url("dashboard.js")
                    ],
                    contentScript: this_cs,
                    onMessage: this_f
                });
    });
}

exports.test_test_run = function(test) {

    test.pass('Unit test running!');
};

exports.test_init_logins = function(test) {
    // Set the storage.login to null, see if it gets created

    // Get into the initial state that a completely new user will have
    delete storage.lastlogin;

    var lastlogin = dbt.get_lastlogin();
    test.assert("lastlogin" in storage.preferences);  // Should now exist
}

exports.test_set_lastlogin = function(test) {

    // Get into the initial state that a completely new user will have
    delete storage.lastlogin;

    dbt.set_lastlogin(karlurl, fakeuser, fakepasswd);

    var lastlogin = dbt.get_lastlogin();
    test.assertEqual(lastlogin.karlurl, karlurl);
    test.assertEqual(lastlogin.username, fakeuser);
    test.assertEqual(lastlogin.password, fakepasswd);
};


exports.test_starts_null = function(test) {

    test.assertEqual(dbt.this_tab, null);
    test.assertEqual(dbt.worker, null);
};

exports.test_make_dashboard = function(test) {

    test.assertEqual(dbt.this_tab, null);
    dbt.make_dashboard();

    timeout(500, function () {
        test.assertNotEqual(dbt.this_tab, null);
        test.assertNotEqual(dbt.worker, null);
        test.done();
    });
    test.waitUntilDone(800);
};

/*
 exports.test_simple_worker = function(test) {

 var cs = "$('#kb-showsetup').click()";

 function f(message) {
 test.assertEqual(message.type, "fetch_setupdata")
 test.done();
 }

 run_worker(cs, f);

 test.waitUntilDone(900);
 }
 */
