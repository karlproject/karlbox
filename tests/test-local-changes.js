// Suppress console.log spewage in addon code
const env = require("env");
env.log = function () {};

const localChanges = require('local-changes');
const file = require("file");


// like setTimeout
function timeout(func, delay) {
    var timer = env.cc['@mozilla.org/timer;1']
        .createInstance(env.ci.nsITimer);
    timer.initWithCallback(func, delay,
        env.ci.nsITimer.TYPE_ONE_SHOT);
    return timer;
}


function TestDir(base_dir) {

    this.remove_base_dir = function() {
        this._remove_dir(base_dir);
    };

    this.create_base_dir = function() {
        file.mkpath(base_dir);
    };

    this.create_file = function(name) {
        this.touch_file(name);
    };

    this.touch_file = function(name) {
        this._touch(file.join(base_dir, name));
    };

    this.remove_file = function(name) {
        file.remove(file.join(base_dir, name));
    };
    
    this._remove_dir = function(path) {
        var self = this;
        if (file.exists(path)) {
            var is_file;
            try {
                file.remove(path);
                is_file = true;
            } catch(exc) {
            }
            if (! is_file) {
                file.list(path).forEach(function(name) {
                    self._remove_dir(file.join(path, name));
                });
                file.rmdir(path);
            }
        }
    };

    this._touch = function(path) {
        var f = file.open(path, 'w');
        f.write('A file');
        f.close();
    };
};

function get_base_dir_path() {
    return '/tmp/karlboxtest';
}

function len(d) {
    var result = 0;
    for (var key in d) {
        if (d.hasOwnProperty(key)) {
            result += 1;
        }
    }
    return result
}

exports.test_empty = function(test) {
    var base_dir_path = get_base_dir_path();
    var test_dir = new TestDir(base_dir_path);
    test_dir.remove_base_dir();

    var result = localChanges.detect(base_dir_path, []);

    test.assertEqual(result.added.length, 0);
    test.assertEqual(result.deleted.length, 0);
    test.assertEqual(result.modified.length, 0);

};

exports.simple = function(test) {
    var base_dir_path = get_base_dir_path();
    var test_dir = new TestDir(base_dir_path);
    test_dir.remove_base_dir();
    test_dir.create_base_dir();
    test_dir.create_file('aaa.txt');
    test_dir.create_file('bbb.txt');

    var files = {};

    // Calling detect will add the two new files
    var result = localChanges.detect(base_dir_path, files);

    test.assertEqual(result.added.length, 2);
    test.assertEqual(result.deleted.length, 0);
    test.assertEqual(result.modified.length, 0);
    test.assertEqual(len(files), 2);

    // Calling it again will not make a change
    var result = localChanges.detect(base_dir_path, files);

    test.assertEqual(result.added.length, 0);
    test.assertEqual(result.deleted.length, 0);
    test.assertEqual(result.modified.length, 0);
    test.assertEqual(len(files), 2);

    // Delete a file and see if it reflects the change
    test_dir.remove_file('aaa.txt');
    var result = localChanges.detect(base_dir_path, files);

    test.assertEqual(result.added.length, 0);
    test.assertEqual(result.deleted.length, 1);
    test.assertEqual(result.modified.length, 0);
    test.assertEqual(len(files), 1);

};

exports.modification = function(test) {
    var base_dir_path = get_base_dir_path();
    var test_dir = new TestDir(base_dir_path);
    test_dir.remove_base_dir();
    test_dir.create_base_dir();
    test_dir.create_file('aaa.txt');
    test_dir.create_file('bbb.txt');

    var files = {};

    // Calling detect will add the two new files
    var result = localChanges.detect(base_dir_path, files);

    test.assertEqual(result.added.length, 2);
    test.assertEqual(result.deleted.length, 0);
    test.assertEqual(result.modified.length, 0);
    test.assertEqual(len(files), 2);

    // wait a sec, really
    timeout(function () {
        // modify one
        test_dir.touch_file('aaa.txt');
        var result = localChanges.detect(base_dir_path, files);

        test.assertEqual(result.added.length, 0);
        test.assertEqual(result.deleted.length, 0);
        test.assertEqual(result.modified.length, 1);
        test.assertEqual(len(files), 2);


        // Calling it again will not make a change
        var result = localChanges.detect(base_dir_path, files);

        test.assertEqual(result.added.length, 0);
        test.assertEqual(result.deleted.length, 0);
        test.assertEqual(result.modified.length, 0);
        test.assertEqual(len(files), 2);

        // wait a sec, really
        timeout(function () {
            // modify one
            test_dir.touch_file('bbb.txt');
            var result = localChanges.detect(base_dir_path, files);

            test.assertEqual(result.added.length, 0);
            test.assertEqual(result.deleted.length, 0);
            test.assertEqual(result.modified.length, 1);
            test.assertEqual(len(files), 2);

            // wait a sec, really
            timeout(function () {
                // modify two
                test_dir.touch_file('aaa.txt');
                test_dir.touch_file('bbb.txt');
                var result = localChanges.detect(base_dir_path, files);

                test.assertEqual(result.added.length, 0);
                test.assertEqual(result.deleted.length, 0);
                test.assertEqual(result.modified.length, 2);
                test.assertEqual(len(files), 2);

                // Finished!
                test.done();
            }, 1000);
        }, 1000);
    }, 1000);

    test.waitUntilDone(5000);
};

