
const localUtils = require("local-utils");
const url = require("url");
const file = require("file");
const data = require('self').data;


function test_dir(dirname) {
    // returns the path of a test directory
    // a test directory is inside tests and contains files
    // that we use for the testing
    var baseDirUrl = data.url('testdata');
    var baseDir = url.toFilename(baseDirUrl);
    var testDir = file.join(baseDir, dirname);
    return testDir;
}

exports.test_list_files = function(test) {
    var lr = localUtils.LocalRoot({baseDir: test_dir('files1')});
    var listFiles = lr.listFiles();
    test.assertEqual(listFiles.length, 0);

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


