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
        var full_fn = file.join(base_dir, filename);
        var f = file.open(full_fn, 'w');
        f.write('A file');
        f.close();
    });

}


exports.test_test_run = function(test) {
    test.pass('Unit test running!');
};

exports.test_sync_file_exists = function(test) {
    test.assert(sm.SyncFile);
};

exports.test_sync_file_basics = function(test) {
    SetupTestDir();
    var fn = file.join(base_dir, "aaa.txt");
    var f = new sm.SyncFile(fn);
    test.assertEqual(f.fullpath, fn);
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
    test.assert(sl.pending_queue.length == 0);
};

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
