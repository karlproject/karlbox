// Suppress console.log spewage in addon code
const env = require("env");
//env.log = function () {
//};


const remoteUtils = require("remote-utils");
const localUtils = require("local-utils");
const syncManager = require("sync-manager");


// fake some functions for easy testability

var FakeState = function(timestamp) {
    this.files = {};
    this.timestamp = timestamp;
};
FakeState.prototype.stepTime = function() {
    this.timestamp += 1;
};
FakeState.prototype.fileNames = function() {
    var fileNames = [];
    for (var fileName in this.files) {
        if (this.files.hasOwnProperty(fileName)) {
            fileNames.push(fileName);
        }
    }
    return fileNames;
};


var FakeLocalRoot = function(options) {
    this.options = options;
};

FakeLocalRoot.prototype._setState = function(state) {
    this.state = state;
};

FakeLocalRoot.prototype.existsRoot = function() {
    // Checks if the root exists
    return true;
};

FakeLocalRoot.prototype.checkRoot = function(hash) {
    // Checks if the root exists, and marked with the correct hash
    return true;
};

FakeLocalRoot.prototype.createRoot = function(hash) {
    // Creates the root, and marks it with the correct hash
};

FakeLocalRoot.prototype.listFiles = function() {
    return this.state.fileNames();
};

FakeLocalRoot.prototype.exists = function(fileName) {
    return this.state.files[fileName] !== undefined;
};

FakeLocalRoot.prototype.readFile = function(fileName) {
    return this.state.files[fileName].content;
};

FakeLocalRoot.prototype.writeFile = function(fileName, txt) {
    this.state.stepTime();
    this.state.files[fileName] = {
        content: txt,
        lastModification: this.timestamp
    };
};

FakeLocalRoot.prototype.mimeType = function(fileName) {
    var mimeType = "text/plain";
    return mimeType
};

FakeLocalRoot.prototype.lastModified = function(fileName) {
    return this.state.files[fileName].lastModification;
};

FakeLocalRoot.prototype.btoa = function(txt) {
    return txt;
};



function FakeQueryRequest(options) {
    this.options = options;
}
FakeQueryRequest.prototype._setState = function(server_state, posted) {
    this.server_state = server_state;
    this.posted = posted;
};
FakeQueryRequest.prototype.post = function() {
    var self = this;
    this.posted.push({
        url: this.options.url,
        timestampfrom: this.options.content.timestampfrom
    });
    var changed_files = [];
    this.server_state.fileNames().forEach(function(fileName) {
        var last_mod = '' + self.server_state.files[fileName].lastModification;
        if (last_mod > self.options.content.timestampfrom) {
            changed_files.push({
                fileName: fileName,
                currentRemote: last_mod
            });
        }
    });
    this.server_state.stepTime();
    var response = {
        json: {
            result: 'OK',
            changed: changed_files,
            timestamp_from: this.options.content.timestampfrom,
            timestamp_to: this.server_state.timestamp
        }
    };
    this.options.onComplete(response);
};


function FakeMultiPoster(options) {
    this.options = options;
}
FakeMultiPoster.prototype._setState = function(server_state, client_state) {
    this.server_state = server_state;
    this.client_state = client_state;
};
FakeMultiPoster.prototype.post = function() {
    var self = this;
    this.options.fileNames.forEach(function(fileName) {
        var response;
        var status;
        self.server_state.stepTime();
        if (self.server_state.files[fileName] !== undefined) { 
            status = "modified";
        } else {
            status = "added";
        }
        response = {
                json: {
                    status: status,
                    result: "OK",
                    filename: fileName,
                    lastremote: self.server_state.timestamp
                }
            };
        self.server_state.files[fileName].content = self.client_state.files[fileName].content;
        self.server_state.files[fileName].lastModification = self.server_state.timestamp;
        //
        if (self.options.onEachResult) {
            self.options.onEachResult(fileName, response);
        }
    });
    if (this.options.onComplete) {
        this.options.onComplete();
    }

};

function FakeMultiGetter(options) {
    this.options = options;
}
FakeMultiGetter.prototype._setState = function(server_state) {
    this.server_state = server_state;
};
FakeMultiGetter.prototype.get = function() {
    var self = this;
    this.options.fileNames.forEach(function(fileName) {
        var response;
        if (self.server_state.files[fileName] !== undefined) { 
            response = {
                status: '200',
                text: self.server_state.files[fileName].content
            };
        } else {
            response = {
                status: '404'
            };
        }
        if (self.options.onEachResult) {
            self.options.onEachResult(fileName, response);
        }
    });
    if (this.options.onComplete) {
        this.options.onComplete();
    }

};



function SyncList(options) {
    var sl = syncManager.SyncList(options);

    sl.test_client_state = new FakeState(600);
    sl.test_server_state = new FakeState(100);
    sl.test_posted_query = [];

    sl.plugs.LocalRoot = function(options) {
        lr = new FakeLocalRoot(options);
        lr._setState(sl.test_client_state);
        return lr;
    };


    sl.plugs.Request = function(options) {
        r = new FakeQueryRequest(options);
        r._setState(sl.test_server_state, sl.test_posted_query);
        return r;
    };

    sl.plugs.MultiGetter = function(options) {
        r = new FakeMultiGetter(options);
        r._setState(sl.test_server_state);
        return r;
    };

    sl.plugs.MultiPoster = function(options) {
        r = new FakeMultiPoster(options);
        r._setState(sl.test_server_state);
        return r;
    };


    return sl;
};


exports.test_empty = function(test) {
    var completed = 0;
    var sync_data = {};
    var sl = SyncList({
        onComplete: function() {
            completed += 1;
        }
    });

    sl.sync();

    test.assertEqual(completed, 1);
    test.assertEqual(sl.test_posted_query.length, 1);

    test.assertEqual(sl.test_server_state.fileNames().length, 0);
    test.assertEqual(sl.test_client_state.fileNames().length, 0);

    sl.sync();

    test.assertEqual(completed, 2);
    test.assertEqual(sl.test_posted_query.length, 2);

    test.assertEqual(sl.test_server_state.fileNames().length, 0);
    test.assertEqual(sl.test_client_state.fileNames().length, 0);
};

exports.test_first_sync = function(test) {
    var completed = 0;
    var sync_data = {};
    var sl = SyncList({
        onComplete: function() {
            completed += 1;
        }
    });

    // some files on the server
    sl.test_server_state.files = {
        'aaa.txt': {content: 'Content', lastModification: 100},  
        'bbb.txt': {content: 'Content', lastModification: 100},  
        'ccc.txt': {content: 'Content', lastModification: 100},  
        'ddd.txt': {content: 'Content', lastModification: 100},  
    };
    sl.test_server_state.timestamp = 101;

    sl.sync();

    test.assertEqual(completed, 1);
    test.assertEqual(sl.test_posted_query.length, 1);

    test.assertEqual(sl.test_server_state.fileNames().length, 4);
    test.assertEqual(sl.test_client_state.fileNames().length, 4);

    sl.sync();

    test.assertEqual(completed, 2);
    test.assertEqual(sl.test_posted_query.length, 2);

    test.assertEqual(sl.test_server_state.fileNames().length, 4);
    test.assertEqual(sl.test_client_state.fileNames().length, 4);

};


/*
 
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
*/


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



