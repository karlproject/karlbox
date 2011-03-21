
const localChanges = require('local-changes');
const file = require("file");

function TestDir(base_dir) {

    this.remove_base_dir = function() {
        this._remove_dir(base_dir);
    };

    this.create_base_dir = function() {
        file.mkpath(base_dir);
    };

    this.create_file = function(name) {
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

exports.test_empty = function(test) {
    var base_dir_path = get_base_dir_path();
    var test_dir = new TestDir(base_dir_path);
    test_dir.remove_base_dir();

    var result = localChanges.detect(base_dir_path, []);

    test.assertEqual(result.added.length, 0);
    test.assertEqual(result.deleted.length, 0);
};

exports.simple = function(test) {
    var base_dir_path = get_base_dir_path();
    var test_dir = new TestDir(base_dir_path);
    test_dir.remove_base_dir();
    test_dir.create_base_dir();
    test_dir.create_file('aaa.txt');
    test_dir.create_file('bbb.txt');

    var filelist = [];

    // Calling detect will add the two new files
    var result = localChanges.detect(base_dir_path, filelist);

    test.assertEqual(result.added.length, 2);
    test.assertEqual(result.deleted.length, 0);
    test.assertEqual(filelist.length, 2);

    // Calling it again will not make a change
    var result = localChanges.detect(base_dir_path, filelist);

    test.assertEqual(result.added.length, 0);
    test.assertEqual(result.deleted.length, 0);
    test.assertEqual(filelist.length, 2);

    // Delete a file and see if it reflects the change
    test_dir.remove_file('aaa.txt');
    var result = localChanges.detect(base_dir_path, filelist);

    test.assertEqual(result.added.length, 0);
    test.assertEqual(result.deleted.length, 1);
    test.assertEqual(filelist.length, 1);

};

