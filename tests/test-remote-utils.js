
const remoteUtils = require("remote-utils");


// --
// fake some functions for easy testability
// --

function FakeLocalRoot(options) {
    this.options = options;
}
FakeLocalRoot.prototype.readFile = function(fileName) {
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
FakeLocalRoot.prototype.mimeType = function(fileName) {
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
FakeLocalRoot.prototype.btoa = function(txt) {
    return txt;
};
// listFiles, localModification are not called from here.

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

    mp.plugs.LocalRoot = function(options) {
        return new FakeLocalRoot(options);
    };
    mp.plugs.Request = function(options) {
        return new _FakeRequest(options);
    };

    return mp;
}

function MultiGetter(options) {

    var mp = remoteUtils.MultiGetter(options);

    mp.posted = [];

    // fake some functions for easy testability
    function _FakeRequest(options) {
        this.options = options;
        this.get = function() {
            mp.posted.push({
                url: this.options.url
            });
            var response = {status: '200', text: 'Some content'};
            this.options.onComplete(response);
        };
    }

    mp.plugs.Request = function(options) {
        return new _FakeRequest(options);
    };

    return mp;
}



// --
// Tests
// --

exports.test_post_zero_file = function(test) {
    var received = [];
    var completed = 0;
    var poster = MultiPoster({
        url: 'http://localhost:6543/communities/default/files/new_upload_file.json',
        authHeader: 'Basic YWRtaW46YWRtaW4=',
        baseDir: '/testdir',
        fileNames: [],
        onEachResult: function(fileName, response) {
            received.push({fileName: fileName, response: response});
        },
        onComplete: function() {
            completed += 1;
        }
    });
    poster.post();

    test.assertEqual(completed, 1);
    test.assertEqual(received.length, 0);
    test.assertEqual(poster.posted.length, 0);
};

exports.test_post_single_file = function(test) {
    var received = [];
    var completed = 0;
    var poster = MultiPoster({
        url: 'http://localhost:6543/communities/default/files/new_upload_file.json',
        authHeader: 'Basic YWRtaW46YWRtaW4=',
        baseDir: '/testdir',
        fileNames: ['aaa.txt'],
        onEachResult: function(fileName, response) {
            received.push({fileName: fileName, response: response});
        },
        onComplete: function() {
            completed += 1;
        }
    });
    poster.post();

    test.assertEqual(completed, 1);
    test.assertEqual(received.length, 1);
    test.assertEqual(poster.posted.length, 1);
    test.assertEqual(poster.posted[0].url, 'http://localhost:6543/communities/default/files/new_upload_file.json');
    test.assertEqual(poster.posted[0].content.binfile, 'aaa.txt content');
    test.assertEqual(poster.posted[0].content.filename, 'aaa.txt');
    test.assertEqual(poster.posted[0].content.mimetype, 'text/plain');
};

exports.test_post_more_files = function(test) {
    var received = [];
    var completed = 0;
    var poster = MultiPoster({
        url: 'http://localhost:6543/communities/default/files/new_upload_file.json',
        authHeader: 'Basic YWRtaW46YWRtaW4=',
        baseDir: '/testdir',
        fileNames: ['aaa.txt', 'bbb.txt', 'ccc.html', 'ddd.pdf'],
        onEachResult: function(fileName, response) {
            received.push({fileName: fileName, response: response});
        },
        onComplete: function() {
            completed += 1;
        }
    });
    poster.post();

    test.assertEqual(completed, 1);
    test.assertEqual(received.length, 4);
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


exports.test_download_zero_file = function(test) {
    var received = [];
    var completed = 0;
    var getter = MultiGetter({
        urlBase: 'http://localhost:6543/communities/default/files',
        urlMethod: 'dl',
        authHeader: 'Basic YWRtaW46YWRtaW4=',
        baseDir: '/testdir',
        fileNames: [],
        onEachResult: function(fileName, response) {
            received.push({fileName: fileName, response: response});
        },
        onComplete: function() {
            completed += 1;
        }
    });
    getter.get();

    test.assertEqual(completed, 1);
    test.assertEqual(received.length, 0);
    test.assertEqual(getter.posted.length, 0);
};

exports.test_download_single_file = function(test) {
    var received = [];
    var completed = 0;
    var getter = MultiGetter({
        urlBase: 'http://localhost:6543/communities/default/files',
        urlMethod: 'dl',
        authHeader: 'Basic YWRtaW46YWRtaW4=',
        baseDir: '/testdir',
        fileNames: ['aaa.txt'],
        onEachResult: function(fileName, response) {
            received.push({fileName: fileName, response: response});
        },
        onComplete: function() {
            completed += 1;
        }
    });
    getter.get();

    test.assertEqual(completed, 1);
    test.assertEqual(received.length, 1);
    test.assertEqual(getter.posted.length, 1);
    test.assertEqual(getter.posted[0].url, 'http://localhost:6543/communities/default/files/aaa.txt/dl');
};

exports.test_download_more_files = function(test) {
    var received = [];
    var completed = 0;
    var getter = MultiGetter({
        urlBase: 'http://localhost:6543/communities/default/files',
        urlMethod: 'dl',
        authHeader: 'Basic YWRtaW46YWRtaW4=',
        baseDir: '/testdir',
        fileNames: ['aaa.txt', 'bbb.txt', 'ccc.html', 'ddd.pdf'],
        onEachResult: function(fileName, response) {
            received.push({fileName: fileName, response: response});
        },
        onComplete: function() {
            completed += 1;
        }
    });
    getter.get();

    test.assertEqual(completed, 1);
    test.assertEqual(received.length, 4);
    test.assertEqual(getter.posted.length, 4);

    test.assertEqual(getter.posted[0].url, 'http://localhost:6543/communities/default/files/aaa.txt/dl');

    test.assertEqual(getter.posted[1].url, 'http://localhost:6543/communities/default/files/bbb.txt/dl');

    test.assertEqual(getter.posted[2].url, 'http://localhost:6543/communities/default/files/ccc.html/dl');

    test.assertEqual(getter.posted[3].url, 'http://localhost:6543/communities/default/files/ddd.pdf/dl');
};


