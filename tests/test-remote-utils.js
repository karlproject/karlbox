
const remoteUtils = require("remote-utils");


function MultiPoster(options) {

    var mp = remoteUtils.MultiPoster(options);

    mp.posted = [];

    function _FakeRequest(options) {
        this.options = options;
        this.post = function() {
            mp.posted.push({
                url: this.options.url,
                content: this.options.content
            });
            var response = {
                json: {"status": "modified", "result": "OK", "filename": this.options.content.filename}
            };
            this.options.onComplete(response);
        };
    }

    // fake some functions for easy testability
    mp.plugs.readfile = function(path) {
        var txt = {
            '/testdir/aaa.txt': 'aaa.txt content',
            '/testdir/bbb.txt': 'bbb.txt content',
            '/testdir/ccc.txt': 'ccc.txt content',
            '/testdir/ddd.txt': 'ddd.txt content'
        }[path];
        if (txt === undefined) {
            throw Error('IO error');
        }
        return txt;
    };
    mp.plugs.btoa = function(txt) {
        return txt;
    };
    mp.plugs.Request = function(options) {
        return new _FakeRequest(options);
    };

    return mp;
}

exports.test_readfile = function(test) {
  test.pass('TODO Need to test readfile.');
};

exports.test_btoa = function(test) {
  test.pass('TODO Need to test btoa.');
};

exports.test_post_zero_file = function(test) {
    var completed = [];
    var poster = MultiPoster({
        url: 'http://localhost:6543/communities/default/files/new_upload_file.json',
        authHeader: 'Basic YWRtaW46YWRtaW4=',
        baseDir: '/testdir',
        fileNames: [],
        onComplete: function(json_results) {
            completed.push(json_results);
        }
    });
    poster.post();

    test.assertEqual(completed.length, 1);
    test.assertEqual(completed[0].length, 0);
    test.assertEqual(poster.posted.length, 0);
};

exports.test_post_single_file = function(test) {
    var completed = [];
    var poster = MultiPoster({
        url: 'http://localhost:6543/communities/default/files/new_upload_file.json',
        authHeader: 'Basic YWRtaW46YWRtaW4=',
        baseDir: '/testdir',
        fileNames: ['aaa.txt'],
        onComplete: function(json_results) {
            completed.push(json_results);
        }
    });
    poster.post();

    test.assertEqual(completed.length, 1);
    test.assertEqual(completed[0].length, 1);
    test.assertEqual(poster.posted.length, 1);
    test.assertEqual(poster.posted[0].url, 'http://localhost:6543/communities/default/files/new_upload_file.json');
    test.assertEqual(poster.posted[0].content.binfile, 'aaa.txt content');
    test.assertEqual(poster.posted[0].content.filename, 'aaa.txt');
};

exports.test_post_more_files = function(test) {
    var completed = [];
    var poster = MultiPoster({
        url: 'http://localhost:6543/communities/default/files/new_upload_file.json',
        authHeader: 'Basic YWRtaW46YWRtaW4=',
        baseDir: '/testdir',
        fileNames: ['aaa.txt', 'bbb.txt', 'ccc.txt', 'ddd.txt'],
        onComplete: function(json_results) {
            completed.push(json_results);
        }
    });
    poster.post();

    test.assertEqual(completed.length, 1);
    test.assertEqual(completed[0].length, 4);
    test.assertEqual(poster.posted.length, 4);

    test.assertEqual(poster.posted[0].url, 'http://localhost:6543/communities/default/files/new_upload_file.json');
    test.assertEqual(poster.posted[0].content.binfile, 'aaa.txt content');
    test.assertEqual(poster.posted[0].content.filename, 'aaa.txt');

    test.assertEqual(poster.posted[1].url, 'http://localhost:6543/communities/default/files/new_upload_file.json');
    test.assertEqual(poster.posted[1].content.binfile, 'bbb.txt content');
    test.assertEqual(poster.posted[1].content.filename, 'bbb.txt');

    test.assertEqual(poster.posted[2].url, 'http://localhost:6543/communities/default/files/new_upload_file.json');
    test.assertEqual(poster.posted[2].content.binfile, 'ccc.txt content');
    test.assertEqual(poster.posted[2].content.filename, 'ccc.txt');

    test.assertEqual(poster.posted[3].url, 'http://localhost:6543/communities/default/files/new_upload_file.json');
    test.assertEqual(poster.posted[3].content.binfile, 'ddd.txt content');
    test.assertEqual(poster.posted[3].content.filename, 'ddd.txt');

};


