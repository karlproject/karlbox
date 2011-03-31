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

