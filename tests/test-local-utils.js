
const localUtils = require("local-utils");
const url = require("url");
const file = require("file");
const data = require('self').data;
const {Cc,Ci,Cr} = require("chrome");


function test_dir(dirname) {
    // returns the path of a test directory
    // a test directory is inside tests and contains files
    // that we use for the testing
    var baseDirUrl = data.url('testdata');
    var baseDir = url.toFilename(baseDirUrl);
    var testDir = file.join(baseDir, dirname);
    return testDir;
}

function tmp_dir() {
    var dirService = Cc["@mozilla.org/file/directory_service;1"].
        getService(Ci.nsIProperties);
    var mozFile = dirService.get("TmpD", Ci.nsIFile);
    mozFile.append("karlboxtest");
    mozFile.createUnique(Ci.nsIFile.DIRECTORY_TYPE, 0755);
    return mozFile.path;
}

function rmdir(path) {
    // aka. rm -rf
    file.list(path).forEach(function(fname) {
        var fpath = file.join(path, fname);
        var mozFile = Cc['@mozilla.org/file/local;1']
             .createInstance(Ci.nsILocalFile);
        mozFile.initWithPath(fpath);
        if (mozFile.isDirectory()) {
            rmdir(fpath);
        } else {
            file.remove(fpath);
        }
    });
    file.rmdir(path);
}




exports.test_exists_root = function(test) {
    var lr = localUtils.LocalRoot({baseDir: test_dir('files1')});
    test.assert(lr.existsRoot());

    lr = localUtils.LocalRoot({baseDir: test_dir('filesNOSUCH')});
    test.assert(! lr.existsRoot());

    // true for files.
    var lr = localUtils.LocalRoot({baseDir: test_dir('somefile')});
    test.assert(lr.existsRoot());
};

exports.test_check_root = function(test) {
    var lr = localUtils.LocalRoot({baseDir: test_dir('files1')});
    test.assert(! lr.checkRoot('cookie'));

    lr = localUtils.LocalRoot({baseDir: test_dir('files3')});
    test.assert(lr.checkRoot('cookie'));

    lr = localUtils.LocalRoot({baseDir: test_dir('files4')});
    test.assert(! lr.checkRoot('cookie'));

    lr = localUtils.LocalRoot({baseDir: test_dir('files3')});
    test.assert(! lr.checkRoot('chocolete'));

    lr = localUtils.LocalRoot({baseDir: test_dir('files4')});
    test.assert(lr.checkRoot('chocolete'));

};

exports.test_create_root = function(test) {
    var root = tmp_dir();
    function rdir(name) {
        return file.join(root, name);
    }
    try {
        var lr = localUtils.LocalRoot({baseDir: rdir('filesX')});
        test.assert(! lr.existsRoot());
        
        lr.createRoot('icecream');
        test.assert(lr.checkRoot('icecream'));
        test.assert(! lr.checkRoot('chuclet'));

        // cannot create upon an existing root
        test.assertRaises(function() {
            lr.createRoot('dust');
        }, /^Root already exists./);

        // can create another one
        lr = localUtils.LocalRoot({baseDir: rdir('filesY')});
        test.assert(! lr.existsRoot());
        lr.createRoot('chuklet');
        test.assert(lr.checkRoot('chuclet'));
        test.assert(! lr.checkRoot('icecream'));

    } finally {
        // clean up
        rmdir(root);
    }
    test.pass(true);
};

exports.test_list_files = function(test) {
    var lr = localUtils.LocalRoot({baseDir: test_dir('files1')});
    var listFiles = lr.listFiles();
    test.assertEqual(listFiles.length, 1);

    lr = localUtils.LocalRoot({baseDir: test_dir('files2')});
    listFiles = lr.listFiles();
    test.assertEqual(listFiles.length, 4);
    test.assertEqual(listFiles[0], 'ccc.odt');
    test.assertEqual(listFiles[1], 'ddd.ods');
    test.assertEqual(listFiles[2], 'html.html');
    test.assertEqual(listFiles[3], 'unitext.txt');
};


exports.test_read_file = function(test) {
    var lr = localUtils.LocalRoot({baseDir: test_dir('files2')});
    var txt = lr.readFile('unitext.txt');
    test.assertEqual(txt.length, 21);

    txt = lr.readFile('html.html');
    test.assertEqual(txt.length, 63);

    txt = lr.readFile('ccc.odt');
    test.assertEqual(txt.length, 7829);

    txt = lr.readFile('ddd.ods');
    test.assertEqual(txt.length, 6864);

    test.assertRaises(function() {
        lr.readFile('nosuch.txt');
    }, /^path does not exist/);
};

exports.test_write_file = function(test) {
    test.pass('XXX TODO write this test');
};

exports.test_exists = function(test) {
    test.pass('XXX TODO write this test');
};


exports.test_mime_type = function(test) {
    var lr = localUtils.LocalRoot({baseDir: test_dir('files2')});
    var mime = lr.mimeType('unitext.txt');
    test.assertEqual(mime, 'text/plain');

    mime = lr.mimeType('html.html');
    test.assertEqual(mime, 'text/html');

    mime = lr.mimeType('ccc.odt');
    test.assertEqual(mime, 'application/vnd.oasis.opendocument.text');

    mime = lr.mimeType('ddd.ods');
    test.assertEqual(mime, 'application/vnd.oasis.opendocument.spreadsheet');

    // XXX does _not_ throw an exception, it's ok though...
    lr.mimeType('nosuch.txt');
};

exports.test_last_modified = function(test) {
    var lr = localUtils.LocalRoot({baseDir: test_dir('files2')});
    var last_modified = lr.lastModified('unitext.txt');
    // we just check that it's a numeric timestamp
    test.assertEqual(typeof last_modified, 'number');

    var last_modified = lr.lastModified('html.html');
    // we just check that it's a numeric timestamp
    test.assertEqual(typeof last_modified, 'number');

    var last_modified = lr.lastModified('ccc.odt');
    // we just check that it's a numeric timestamp
    test.assertEqual(typeof last_modified, 'number');

    var last_modified = lr.lastModified('ddd.ods');
    // we just check that it's a numeric timestamp
    test.assertEqual(typeof last_modified, 'number');

    test.assertRaises(function() {
        lr.lastModified('nosuch.txt');
    }, /^Component returned failure code/);
};


exports.test_btoa = function(test) {
    var lr = localUtils.LocalRoot({baseDir: test_dir('files2')});
    var txt = lr.btoa('abcde');
    test.assertEqual(txt, 'YWJjZGU=');
};


