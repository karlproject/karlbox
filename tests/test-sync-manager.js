// Suppress console.log spewage in addon code
const env = require("env");
env.log = function () {
};

const file = require("file");
const sm = require("sync-manager");

// Override global
var base_dir = '/tmp/karlboxtest';
var _save_base_dir = '';

function SetupTestDir() {
    
    _save_base_dir = env._save_base_dir;
    env.base_dir = base_dir;

    // First remove the test dir if it exists
    if (file.exists(base_dir)) {
        file.list(base_dir).forEach(function(filename) {
            file.remove(file.join(base_dir, filename));
        });
        file.rmdir(base_dir);
    }

    // Now make the testing directory, with some stuff in it
    file.mkpath(base_dir);
    var sample_filenames = ['aaa.txt', 'bbb.txt', 'ccc.txt', 'ddd.txt'];
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


function touch_file(fn) {
    var full_fn = file.join(base_dir, fn);
    var f = file.open(full_fn, 'w');
    f.write('A file');
    f.close();
}

function get_file(fn) {
    var f = new sm.SyncFile(base_dir, fn);
    return f;
}

//  ###########################

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
        test.done();
    });

    test.waitUntilDone(5000);
}

exports.test_sync_list_syncd_second_modified = function(test) {
    // File was added and syncd.  Then modified, first run
    // through.  Now it is the second run through.

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

        // First run through
        touch_file("aaa.txt");
        var f2 = get_file("aaa.txt");
        sl.push(f2);
        
        // wait another, to modify again
        timeout(1000, function () {
            // Second run through
            touch_file("aaa.txt");
            var f3 = get_file("aaa.txt");
            sl.push(f3);

            var r = sl.sync_map[full_fn];
            test.assert(r);
            test.assertEqual(r.status, "modified");
            test.assertEqual(r.last_local, f3.last_modified);
            test.assertEqual(r.last_remote, f1.last_modified);
            
            test.done()
        });

    });

    test.waitUntilDone(5000);
}

exports.test_sync_list_deleted = function(test) {

    // Make up some dummy state
    var deleted_fn = file.join(base_dir, "XXX.txt");
    var dummy = get_file("aaa.txt");
    var sync_map = new Array();
    sync_map[deleted_fn] = {
        status: "syncd",
        last_local: dummy.last_modified,
        last_remote: dummy.last_modified
    };

    var sl = new sm.SyncList(sync_map);
    sl.mark_deleted();
    test.assertEqual(sl.sync_map[deleted_fn].status, "deleted");
    sl.mark_deleted();

};

exports.test_sync_list_bogus_push_status = function(test) {
    // If something gets onto the sync_map with a bogus
    // status, and we push something on with the same key, we should
    // fail gracefully.

    var f = get_file("aaa.txt")
    var data = new Array();
    data[f.fullpath] = {
        status: "bogus",
        last_local: null,
        last_remote: null
    };
    var sl = new sm.SyncList(data);

    function pusher() {
        sl.push(f);
    }

    test.assertRaises(pusher, "Bogus sync status of: bogus")
};

exports.test_sync_list_get_uploads = function(test) {
    // Make a sync_map, get back objects needing upload

    // Bootstrap
    SetupTestDir();
    var sl = new sm.SyncList({});

    var f1 = get_file("aaa.txt");
    sl.push(f1);
    var f2 = get_file("bbb.txt");
    sl.push(f2);
    var f3 = get_file("ccc.txt");
    sl.push(f3);
    var f4 = get_file("ddd.txt");
    sl.push(f4);

    sl.sync_map[f1.fullpath].status = "modified";
    sl.sync_map[f1.fullpath].status = "deleted";
    sl.sync_map[f1.fullpath].status = "syncd";

    var matching = sl.get_uploads();
    test.assertEqual(matching.length, 3);
};

exports.test_sync_list_prepare_sync = function(test) {
    SetupTestDir();
    var sl = new sm.SyncList({});
    var f1 = sl.push(get_file("aaa.txt"));
    var f2 = sl.push(get_file("bbb.txt"));
    var f3 = sl.push(get_file("ccc.txt"));

    var payload = sl.prepare_sync();
    test.assert(payload['filename-0']);
    test.assert(payload['binfile-0']);
};

exports.test_sync_list_sync = function(test) {
    SetupTestDir();
    var sl = new sm.SyncList({});
    var f1 = sl.push(get_file("aaa.txt"));
    var f2 = sl.push(get_file("bbb.txt"));
    var f3 = sl.push(get_file("ccc.txt"));

    sl.sync();
    test.pass("ok");
};


/*
exports.test_sync_list_sync_old = function(test) {
    // Make a sync_map, get back objects needing upload

    // Bootstrap
    SetupTestDir();
    var sl = new sm.SyncList({});

    var f1 = sl.push(get_file("aaa.txt"));
    var f2 = sl.push(get_file("bbb.txt"));
    var f3 = sl.push(get_file("ccc.txt"));

    //sl.sync();
    // XXX Need a better test, with a pluggable request
    test.pass("ok");
};
*/



