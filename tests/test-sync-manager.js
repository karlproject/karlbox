// Suppress console.log spewage in addon code
const env = require("env");
env.log = function () {
};

const file = require("file");
const sm = require("sync-manager");

// Override global
var base_dir = '/tmp/karlboxtest';

function SetupTestDir() {

    // First remove the test dir if it exists
    if (file.exists(base_dir)) {
        file.list(base_dir).forEach(function(filename) {
            file.remove(file.join(base_dir, filename));
        });
        file.rmdir(base_dir);
    }

    // Now make the testing directory, with some stuff in it
    file.mkpath(base_dir);
    var sample_filenames = ['aaa.txt', 'bbb.txt', 'ccc.txt'];
    sample_filenames.forEach(function(filename) {
        touch_file(filename);
    });

}

// like setTimeout
function timeout(delay, func) {
    var timer = env.cc['@mozilla.org/timer;1']
        .createInstance(env.ci.nsITimer);
    timer.initWithCallback(func, delay,
        env.ci.nsITimer.TYPE_ONE_SHOT);
    return timer;
}


function touch_file (fn) {
    var full_fn = file.join(base_dir, fn);
    var f = file.open(full_fn, 'w');
    f.write('A file');
    f.close();
}

function get_file (fn) {
    var full_fn = file.join(base_dir, fn);
    var f = new sm.SyncFile(full_fn);
    return f;
}


exports.test_test_run = function(test) {
    test.pass('Unit test running!');
};

exports.test_sync_file_exists = function(test) {
    test.assert(sm.SyncFile);
};

exports.test_sync_file_basics = function(test) {
    SetupTestDir();
    var f = get_file("aaa.txt");
    test.assertEqual(f.fullpath, file.join(base_dir, "aaa.txt"));
    test.assert(f.last_modified > 1301604212000);
    test.assertEqual(f.readEncoded(), "QSBmaWxl");
};

exports.test_sync_list_exists = function(test) {
    test.assert(sm.SyncList);
};

exports.test_sync_list_stored = function(test) {
    var sl = new sm.SyncList({"aaa.txt": 999});
    test.assert("aaa.txt" in sl.sync_map);
    ;
};

exports.test_sync_list_initial_queue = function(test) {
    var sl = new sm.SyncList({});
    test.assert(sl.sync_map = {});
};

exports.test_sync_list_initial_add = function(test) {
    // Make an empty sync list, push file that has never been seen.

    // Bootstrap
    SetupTestDir();
    var sl = new sm.SyncList({});

    var full_fn = file.join(base_dir, "aaa.txt");
    var f = new sm.SyncFile(full_fn);
    sl.push(f);

    var r = sl.sync_map[full_fn];
    test.assert(r);
    test.assertEqual(r.status, "added");
    test.assertEqual(r.last_local, f.last_modified);
    test.assertEqual(r.last_remote, null);
}

exports.test_sync_list_already_added = function(test) {
    // Make an empty sync list, push file was just added but not
    // yet syncd.

    // Bootstrap
    SetupTestDir();
    var full_fn = file.join(base_dir, "aaa.txt");
    var sl = new sm.SyncList({});

    var f1 = get_file("aaa.txt");
    sl.push(f1);
    delete(f1);

    // Now change that file
    touch_file("aaa.txt");
    var f2 = get_file("aaa.txt");

    var r = sl.sync_map[full_fn];
    test.assert(r);
    test.assertEqual(r.status, "added");
    test.assertEqual(r.last_local, f2.last_modified);
    test.assertEqual(r.last_remote, null);
}

exports.test_sync_list_syncd_first_modified = function(test) {
    // File was added and syncd.  Then modified, first run through.

    // Bootstrap
    SetupTestDir();
    var full_fn = file.join(base_dir, "aaa.txt");
    var f1 = get_file("aaa.txt");
    var sl = new sm.SyncList(
            {full_fn: {
                status: "syncd",
                last_local: f1.last_modified,
                last_remote: f1.last_modified
            }
            });

    // Now change the file, push it on. We need to wait a second to
    // so the last modification time is rev'd.
    timeout(1000, function () {
            touch_file("aaa.txt");
            var f2 = get_file("aaa.txt");
            sl.push(f2);


            var r = sl.sync_map[full_fn];
            test.assert(r);
            test.assertEqual(r.status, "modified");
            test.assertEqual(r.last_local, f2.last_modified);
            test.assertEqual(r.last_remote, f1.last_modified);
        });

    test.assert(1);
}

/*
exports.test_sync_list_push_scenarios = function(test) {
    // Various initial and post-initial states of the queue

    // Bootstrap
    SetupTestDir();
    var sl = new sm.SyncList({});

    // At this point, the Karlbox has never run, but has
    // files in the kb directory that need syncing.
    var sample_filenames = ['aaa.txt', 'bbb.txt', 'ccc.txt'];
    sample_filenames.forEach(function(filename) {
        var full_fn = file.join(base_dir, filename);
        var f = new sm.SyncFile(full_fn);
        sl.push(f);
    });

    // Now do some tests
    var full_fn_1 = file.join(base_dir, "aaa.txt");
    var full_fn_2 = file.join(base_dir, "XYZ.txt");
    var qi_1 = sl.sync_map[full_fn_1];
    var qi_2 = sl.sync_map[full_fn_2];
    test.assert(qi_1, "Fn1 " + full_fn_1 + " not in syncmap");
    test.assert(!qi_2, "Fn2 " + full_fn_2 + " wrongly in syncmap");
test.assertEqual(qi_1.status == "added");   
};
*/