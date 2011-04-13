
const remoteUtils = require("remote-utils");


function MultiPoster(options) {

    var mp = remoteUtils.MultiPoster(options);

    mp.posted = [];

    // fake some functions for easy testability
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

    function _FakeLocalRoot(options) {
        this.options = options;
        
        this.readFile = function(fileName) {
            var txt = {
                'aaa.txt': 'aaa.txt content',
                'bbb.txt': 'bbb.txt content',
                'ccc.html': 'ccc.html content',
                'ddd.pdf': 'ddd.pdf content'
            }[fileName];
            if (txt === undefined) {
                throw Error('IO error');
            }
            return txt;
        };

        this.mimeType = function(fileName) {
            var mimeType = {
                'aaa.txt': 'text/plain',
                'bbb.txt': 'text/plain',
                'ccc.html': 'text/html',
                'ddd.pdf': 'application/pdf'
            }[fileName];
            if (mimeType === undefined) {
                //throw Error('IO error');
            }
            return mimeType;
        };

        this.btoa = function(txt) {
            return txt;
        };

        // listFiles, localModification are not called from here.
    };

    mp.plugs.LocalRoot = function(options) {
        return new _FakeLocalRoot(options);
    };
    mp.plugs.Request = function(options) {
        return new _FakeRequest(options);
    };

    return mp;
}

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
    test.assertEqual(poster.posted[0].content.mimetype, 'text/plain');
};

exports.test_post_more_files = function(test) {
    var completed = [];
    var poster = MultiPoster({
        url: 'http://localhost:6543/communities/default/files/new_upload_file.json',
        authHeader: 'Basic YWRtaW46YWRtaW4=',
        baseDir: '/testdir',
        fileNames: ['aaa.txt', 'bbb.txt', 'ccc.html', 'ddd.pdf'],
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
    test.assertEqual(poster.posted[0].content.mimetype, 'text/plain');

    test.assertEqual(poster.posted[1].url, 'http://localhost:6543/communities/default/files/new_upload_file.json');
    test.assertEqual(poster.posted[1].content.binfile, 'bbb.txt content');
    test.assertEqual(poster.posted[1].content.filename, 'bbb.txt');
    test.assertEqual(poster.posted[1].content.mimetype, 'text/plain');

    test.assertEqual(poster.posted[2].url, 'http://localhost:6543/communities/default/files/new_upload_file.json');
    test.assertEqual(poster.posted[2].content.binfile, 'ccc.html content');
    test.assertEqual(poster.posted[2].content.filename, 'ccc.html');
    test.assertEqual(poster.posted[2].content.mimetype, 'text/html');

    test.assertEqual(poster.posted[3].url, 'http://localhost:6543/communities/default/files/new_upload_file.json');
    test.assertEqual(poster.posted[3].content.binfile, 'ddd.pdf content');
    test.assertEqual(poster.posted[3].content.filename, 'ddd.pdf');
    test.assertEqual(poster.posted[3].content.mimetype, 'application/pdf');

};


