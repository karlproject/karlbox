// Suppress console.log spewage in addon code
// return;
const env = require("env");
env.log = function () {
};

const syncManager = require("sync-manager");


// --
// fake some functions for easy testability
// --

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
FakeState.prototype.byServerPath = function(serverPath) {
    for (var fileName in this.files) {
        if (this.files.hasOwnProperty(fileName)) {
            if (this.files[fileName].serverPath == serverPath) {
                return this.files[fileName];
            }
        }
    }
    return undefined;
};
FakeState.prototype.nameToPath = function(fileName) {
    // for the test, every @ character is converted to - in the name.
    var serverPath = fileName.replace(/@/g, '-');
    return serverPath;
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
        var serverPath =  self.server_state.nameToPath(fileName);
        if (last_mod > self.options.content.timestampfrom) {
            changed_files.push({
                fileName: fileName,
                serverPath: serverPath,
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
        var result;
        self.server_state.stepTime();
        // simulate server-side filename mangling
        var serverPath = self.server_state.nameToPath(fileName);
        var stored_file = self.server_state.byServerPath(serverPath);
        //
        if (stored_file !== undefined) { 
            if (self.server_state.files[fileName]) {
                status = "modified";
                result = "OK";
            } else {
                // The file is in conflict because there is already a different
                // file, for which the server uses the same path.
                status = "conflict";
                result = "CONFLICT";
            }
        } else {
            status = "added";
            result = "OK";
            stored_file = self.server_state.files[fileName] = {};
        }
        //
        if (result == "OK") {
            // added or modified. Simulate "storing the file"
            stored_file.content = self.client_state.files[fileName].content;
            stored_file.lastModification = self.server_state.timestamp;
            stored_file.serverPath = serverPath;
        }
        response = {
                json: {
                    status: status,
                    result: result,
                    filename: fileName,
                    lastremote: stored_file.lastModification
                }
            };
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
    this.options.syncItems.forEach(function(syncItem) {
        var response;
        var server_file = self.server_state.files[syncItem.fileName];
        if  (server_file !== undefined && server_file.serverPath == syncItem.serverPath) { 
            response = {
                status: '200',
                text: server_file.content
            };
        } else {
            response = {
                status: '404'
            };
        }
        if (self.options.onEachResult) {
            self.options.onEachResult(syncItem, response);
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
        r._setState(sl.test_server_state, sl.test_client_state);
        return r;
    };


    return sl;
};



// --
// Tests
// --

function check_statuses(test, sl, o) {
    test.assertEqual(sl.pullResults.added.length, o.pull_added);
    test.assertEqual(sl.pullResults.modified.length, o.pull_modified);
    test.assertEqual(sl.pullResults.deleted.length, o.pull_deleted);
    test.assertEqual(sl.pullResults.errors.length, o.pull_errors);
    test.assertEqual(sl.pullResults.conflicts.length, o.pull_conflicts);
    test.assertEqual(sl.pushResults.added.length, o.push_added);
    test.assertEqual(sl.pushResults.modified.length, o.push_modified);
    test.assertEqual(sl.pushResults.deleted.length, o.push_deleted);
    test.assertEqual(sl.pushResults.errors.length, o.push_errors);
    test.assertEqual(sl.pushResults.conflicts.length, o.push_conflicts);
}


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

    check_statuses(test, sl, {
        pull_added: 0,
        pull_modified: 0,
        pull_deleted: 0,
        pull_errors: 0,
        pull_conflicts: 0,

        push_added: 0,
        push_modified: 0,
        push_deleted: 0,
        push_errors: 0,
        push_conflicts: 0
    });

    sl.sync();

    test.assertEqual(completed, 2);
    test.assertEqual(sl.test_posted_query.length, 2);

    test.assertEqual(sl.test_server_state.fileNames().length, 0);
    test.assertEqual(sl.test_client_state.fileNames().length, 0);

    check_statuses(test, sl, {
        pull_added: 0,
        pull_modified: 0,
        pull_deleted: 0,
        pull_errors: 0,
        pull_conflicts: 0,

        push_added: 0,
        push_modified: 0,
        push_deleted: 0,
        push_errors: 0,
        push_conflicts: 0
    });

};

exports.test_first_download = function(test) {
    var completed = 0;
    var sync_data = {};
    var sl = SyncList({
        onComplete: function() {
            completed += 1;
        }
    });

    // some files on the server
    sl.test_server_state.files = {
        'aaa.txt': {content: 'Content', lastModification: 100, serverPath: 'aaa.txt'}, 
        'bbb.txt': {content: 'Content', lastModification: 100, serverPath: 'bbb.txt'},
        'ccc.txt': {content: 'Content', lastModification: 100, serverPath: 'ccc.txt'},
        'ddd.txt': {content: 'Content', lastModification: 100, serverPath: 'ddd.txt'}
    };

    sl.sync();

    test.assertEqual(completed, 1);
    test.assertEqual(sl.test_posted_query.length, 1);

    test.assertEqual(sl.test_server_state.fileNames().length, 4);
    test.assertEqual(sl.test_client_state.fileNames().length, 4);

    check_statuses(test, sl, {
        pull_added: 4,
        pull_modified: 0,
        pull_deleted: 0,
        pull_errors: 0,
        pull_conflicts: 0,

        push_added: 0,
        push_modified: 0,
        push_deleted: 0,
        push_errors: 0,
        push_conflicts: 0
    });


    sl.sync();

    test.assertEqual(completed, 2);
    test.assertEqual(sl.test_posted_query.length, 2);

    test.assertEqual(sl.test_server_state.fileNames().length, 4);
    test.assertEqual(sl.test_client_state.fileNames().length, 4);

    check_statuses(test, sl, {
        pull_added: 0,
        pull_modified: 0,
        pull_deleted: 0,
        pull_errors: 0,
        pull_conflicts: 0,

        push_added: 0,
        push_modified: 0,
        push_deleted: 0,
        push_errors: 0,
        push_conflicts: 0
    });

};

exports.test_first_upload = function(test) {
    var completed = 0;
    var sync_data = {};
    var sl = SyncList({
        onComplete: function() {
            completed += 1;
        }
    });

    // some files on the client
    sl.test_client_state.files = {
        'aaa.txt': {content: 'Content', lastModification: 600},  
        'bbb.txt': {content: 'Content', lastModification: 600},  
        'ccc.txt': {content: 'Content', lastModification: 600},  
        'ddd.txt': {content: 'Content', lastModification: 600},  
    };

    sl.sync();

    test.assertEqual(completed, 1);
    test.assertEqual(sl.test_posted_query.length, 1);

    test.assertEqual(sl.test_server_state.fileNames().length, 4);
    test.assertEqual(sl.test_client_state.fileNames().length, 4);

    check_statuses(test, sl, {
        pull_added: 0,
        pull_modified: 0,
        pull_deleted: 0,
        pull_errors: 0,
        pull_conflicts: 0,

        push_added: 4,
        push_modified: 0,
        push_deleted: 0,
        push_errors: 0,
        push_conflicts: 0
    });

    sl.sync();

    test.assertEqual(completed, 2);
    test.assertEqual(sl.test_posted_query.length, 2);

    test.assertEqual(sl.test_server_state.fileNames().length, 4);
    test.assertEqual(sl.test_client_state.fileNames().length, 4);

    check_statuses(test, sl, {
        pull_added: 0,
        pull_modified: 0,
        pull_deleted: 0,
        pull_errors: 0,
        pull_conflicts: 0,

        push_added: 0,
        push_modified: 0,
        push_deleted: 0,
        push_errors: 0,
        push_conflicts: 0
    });

};

exports.test_client_adding = function(test) {
    var completed = 0;
    var sync_data = {};
    var sl = SyncList({
        onComplete: function() {
            completed += 1;
        }
    });

    // some files on the server
    sl.test_server_state.files = {
        'aaa.txt': {content: 'Content', lastModification: 100, serverPath: 'aaa.txt'},
        'bbb.txt': {content: 'Content', lastModification: 100, serverPath: 'bbb.txt'},
        'ccc.txt': {content: 'Content', lastModification: 100, serverPath: 'ccc.txt'},
        'ddd.txt': {content: 'Content', lastModification: 100, serverPath: 'ddd.txt'}
    };

    sl.sync();

    test.assertEqual(completed, 1);
    test.assertEqual(sl.test_posted_query.length, 1);

    test.assertEqual(sl.test_server_state.fileNames().length, 4);
    test.assertEqual(sl.test_client_state.fileNames().length, 4);

    check_statuses(test, sl, {
        pull_added: 4,
        pull_modified: 0,
        pull_deleted: 0,
        pull_errors: 0,
        pull_conflicts: 0,

        push_added: 0,
        push_modified: 0,
        push_deleted: 0,
        push_errors: 0,
        push_conflicts: 0
    });


    // some files on the client
    sl.test_client_state.stepTime()
    sl.test_client_state.files['eee.txt'] = {
        content: 'Content', lastModification: sl.test_client_state.timestamp
    };

    sl.sync();

    test.assertEqual(completed, 2);
    test.assertEqual(sl.test_posted_query.length, 2);

    test.assertEqual(sl.test_server_state.fileNames().length, 5);
    test.assertEqual(sl.test_client_state.fileNames().length, 5);

    check_statuses(test, sl, {
        pull_added: 0,
        pull_modified: 0,
        pull_deleted: 0,
        pull_errors: 0,
        pull_conflicts: 0,

        push_added: 1,
        push_modified: 0,
        push_deleted: 0,
        push_errors: 0,
        push_conflicts: 0
    });


    sl.sync();

    test.assertEqual(completed, 3);
    test.assertEqual(sl.test_posted_query.length, 3);

    test.assertEqual(sl.test_server_state.fileNames().length, 5);
    test.assertEqual(sl.test_client_state.fileNames().length, 5);

    check_statuses(test, sl, {
        pull_added: 0,
        pull_modified: 0,
        pull_deleted: 0,
        pull_errors: 0,
        pull_conflicts: 0,

        push_added: 0,
        push_modified: 0,
        push_deleted: 0,
        push_errors: 0,
        push_conflicts: 0
    });

};

exports.test_client_modifying = function(test) {
    var completed = 0;
    var sync_data = {};
    var sl = SyncList({
        onComplete: function() {
            completed += 1;
        }
    });

    // some files on the server
    sl.test_server_state.files = {
        'aaa.txt': {content: 'Content', lastModification: 100, serverPath: 'aaa.txt'},
        'bbb.txt': {content: 'Content', lastModification: 100, serverPath: 'bbb.txt'},
        'ccc.txt': {content: 'Content', lastModification: 100, serverPath: 'ccc.txt'},
        'ddd.txt': {content: 'Content', lastModification: 100, serverPath: 'ddd.txt'}
    };

    sl.sync();

    test.assertEqual(completed, 1);
    test.assertEqual(sl.test_posted_query.length, 1);

    test.assertEqual(sl.test_server_state.fileNames().length, 4);
    test.assertEqual(sl.test_client_state.fileNames().length, 4);

    check_statuses(test, sl, {
        pull_added: 4,
        pull_modified: 0,
        pull_deleted: 0,
        pull_errors: 0,
        pull_conflicts: 0,

        push_added: 0,
        push_modified: 0,
        push_deleted: 0,
        push_errors: 0,
        push_conflicts: 0
    });


    // some files on the client
    sl.test_client_state.stepTime()
    sl.test_client_state.files['ccc.txt'] = {
        content: 'New content', lastModification: sl.test_client_state.timestamp
    };

    sl.sync();

    test.assertEqual(completed, 2);
    test.assertEqual(sl.test_posted_query.length, 2);

    test.assertEqual(sl.test_server_state.fileNames().length, 4);
    test.assertEqual(sl.test_client_state.fileNames().length, 4);

    check_statuses(test, sl, {
        pull_added: 0,
        pull_modified: 0,
        pull_deleted: 0,
        pull_errors: 0,
        pull_conflicts: 0,

        push_added: 0,
        push_modified: 1,
        push_deleted: 0,
        push_errors: 0,
        push_conflicts: 0
    });


    sl.sync();

    test.assertEqual(completed, 3);
    test.assertEqual(sl.test_posted_query.length, 3);

    test.assertEqual(sl.test_server_state.fileNames().length, 4);
    test.assertEqual(sl.test_client_state.fileNames().length, 4);

    check_statuses(test, sl, {
        pull_added: 0,
        pull_modified: 0,
        pull_deleted: 0,
        pull_errors: 0,
        pull_conflicts: 0,

        push_added: 0,
        push_modified: 0,
        push_deleted: 0,
        push_errors: 0,
        push_conflicts: 0
    });

};

exports.test_server_adding = function(test) {
    var completed = 0;
    var sync_data = {};
    var sl = SyncList({
        onComplete: function() {
            completed += 1;
        }
    });

    // some files on the server
    sl.test_server_state.files = {
        'aaa.txt': {content: 'Content', lastModification: 100, serverPath: 'aaa.txt'},
        'bbb.txt': {content: 'Content', lastModification: 100, serverPath: 'bbb.txt'},
        'ccc.txt': {content: 'Content', lastModification: 100, serverPath: 'ccc.txt'},
        'ddd.txt': {content: 'Content', lastModification: 100, serverPath: 'ddd.txt'}
    };

    sl.sync();

    test.assertEqual(completed, 1);
    test.assertEqual(sl.test_posted_query.length, 1);

    test.assertEqual(sl.test_server_state.fileNames().length, 4);
    test.assertEqual(sl.test_client_state.fileNames().length, 4);

    check_statuses(test, sl, {
        pull_added: 4,
        pull_modified: 0,
        pull_deleted: 0,
        pull_errors: 0,
        pull_conflicts: 0,

        push_added: 0,
        push_modified: 0,
        push_deleted: 0,
        push_errors: 0,
        push_conflicts: 0
    });


    // some files on the server
    sl.test_server_state.stepTime()
    sl.test_server_state.files['eee.txt'] = {
        content: 'Content', lastModification: sl.test_server_state.timestamp, serverPath: 'eee.txt'
    };

    sl.sync();

    test.assertEqual(completed, 2);
    test.assertEqual(sl.test_posted_query.length, 2);

    test.assertEqual(sl.test_server_state.fileNames().length, 5);
    test.assertEqual(sl.test_client_state.fileNames().length, 5);

    check_statuses(test, sl, {
        pull_added: 1,
        pull_modified: 0,
        pull_deleted: 0,
        pull_errors: 0,
        pull_conflicts: 0,

        push_added: 0,
        push_modified: 0,
        push_deleted: 0,
        push_errors: 0,
        push_conflicts: 0
    });


    sl.sync();

    test.assertEqual(completed, 3);
    test.assertEqual(sl.test_posted_query.length, 3);

    test.assertEqual(sl.test_server_state.fileNames().length, 5);
    test.assertEqual(sl.test_client_state.fileNames().length, 5);

    check_statuses(test, sl, {
        pull_added: 0,
        pull_modified: 0,
        pull_deleted: 0,
        pull_errors: 0,
        pull_conflicts: 0,

        push_added: 0,
        push_modified: 0,
        push_deleted: 0,
        push_errors: 0,
        push_conflicts: 0
    });

};

exports.test_server_modifying = function(test) {
    var completed = 0;
    var sync_data = {};
    var sl = SyncList({
        onComplete: function() {
            completed += 1;
        }
    });

    // some files on the server
    sl.test_server_state.files = {
        'aaa.txt': {content: 'Content', lastModification: 100, serverPath: 'aaa.txt'},  
        'bbb.txt': {content: 'Content', lastModification: 100, serverPath: 'bbb.txt'},  
        'ccc.txt': {content: 'Content', lastModification: 100, serverPath: 'ccc.txt'},  
        'ddd.txt': {content: 'Content', lastModification: 100, serverPath: 'ddd.txt'}
    };

    sl.sync();

    test.assertEqual(completed, 1);
    test.assertEqual(sl.test_posted_query.length, 1);

    test.assertEqual(sl.test_server_state.fileNames().length, 4);
    test.assertEqual(sl.test_client_state.fileNames().length, 4);

    check_statuses(test, sl, {
        pull_added: 4,
        pull_modified: 0,
        pull_deleted: 0,
        pull_errors: 0,
        pull_conflicts: 0,

        push_added: 0,
        push_modified: 0,
        push_deleted: 0,
        push_errors: 0,
        push_conflicts: 0
    });


    // some files on the server
    sl.test_server_state.stepTime()
    sl.test_server_state.files['ccc.txt'] = {
        content: 'New content', lastModification: sl.test_server_state.timestamp, serverPath: 'ccc.txt'
    };

    sl.sync();

    test.assertEqual(completed, 2);
    test.assertEqual(sl.test_posted_query.length, 2);

    test.assertEqual(sl.test_server_state.fileNames().length, 4);
    test.assertEqual(sl.test_client_state.fileNames().length, 4);

    check_statuses(test, sl, {
        pull_added: 0,
        pull_modified: 1,
        pull_deleted: 0,
        pull_errors: 0,
        pull_conflicts: 0,

        push_added: 0,
        push_modified: 0,
        push_deleted: 0,
        push_errors: 0,
        push_conflicts: 0
    });


    sl.sync();

    test.assertEqual(completed, 3);
    test.assertEqual(sl.test_posted_query.length, 3);

    test.assertEqual(sl.test_server_state.fileNames().length, 4);
    test.assertEqual(sl.test_client_state.fileNames().length, 4);

    check_statuses(test, sl, {
        pull_added: 0,
        pull_modified: 0,
        pull_deleted: 0,
        pull_errors: 0,
        pull_conflicts: 0,

        push_added: 0,
        push_modified: 0,
        push_deleted: 0,
        push_errors: 0,
        push_conflicts: 0
    });

};

exports.test_add_modify_combo1 = function(test) {
    var completed = 0;
    var sync_data = {};
    var sl = SyncList({
        onComplete: function() {
            completed += 1;
        }
    });

    // some files on the server
    sl.test_server_state.files = {
        'aaa.txt': {content: 'Content', lastModification: 100, serverPath: 'aaa.txt'},
        'bbb.txt': {content: 'Content', lastModification: 100, serverPath: 'bbb.txt'},
        'ccc.txt': {content: 'Content', lastModification: 100, serverPath: 'ccc.txt'},
        'ddd.txt': {content: 'Content', lastModification: 100, serverPath: 'ddd.txt'} 
    };

    sl.sync();

    test.assertEqual(completed, 1);
    test.assertEqual(sl.test_posted_query.length, 1);

    test.assertEqual(sl.test_server_state.fileNames().length, 4);
    test.assertEqual(sl.test_client_state.fileNames().length, 4);

    check_statuses(test, sl, {
        pull_added: 4,
        pull_modified: 0,
        pull_deleted: 0,
        pull_errors: 0,
        pull_conflicts: 0,

        push_added: 0,
        push_modified: 0,
        push_deleted: 0,
        push_errors: 0,
        push_conflicts: 0
    });


    // some files on the server
    sl.test_server_state.stepTime()
    sl.test_server_state.files['eee.txt'] = {
        content: 'New content', lastModification: sl.test_server_state.timestamp, serverPath: 'eee.txt'
    };
    sl.test_server_state.files['ccc.txt'] = {
        content: 'New content', lastModification: sl.test_server_state.timestamp, serverPath: 'ccc.txt'
    };
    // some files on the client
    sl.test_client_state.stepTime()
    sl.test_client_state.files['fff.txt'] = {
        content: 'New content', lastModification: sl.test_client_state.timestamp
    };
    sl.test_client_state.files['aaa.txt'] = {
        content: 'New content', lastModification: sl.test_client_state.timestamp
    };


    sl.sync();

    test.assertEqual(completed, 2);
    test.assertEqual(sl.test_posted_query.length, 2);

    test.assertEqual(sl.test_server_state.fileNames().length, 6);
    test.assertEqual(sl.test_client_state.fileNames().length, 6);

    check_statuses(test, sl, {
        pull_added: 1,
        pull_modified: 1,
        pull_deleted: 0,
        pull_errors: 0,
        pull_conflicts: 0,

        push_added: 1,
        push_modified: 1,
        push_deleted: 0,
        push_errors: 0,
        push_conflicts: 0
    });


    sl.sync();

    test.assertEqual(completed, 3);
    test.assertEqual(sl.test_posted_query.length, 3);

    test.assertEqual(sl.test_server_state.fileNames().length, 6);
    test.assertEqual(sl.test_client_state.fileNames().length, 6);

    check_statuses(test, sl, {
        pull_added: 0,
        pull_modified: 0,
        pull_deleted: 0,
        pull_errors: 0,
        pull_conflicts: 0,

        push_added: 0,
        push_modified: 0,
        push_deleted: 0,
        push_errors: 0,
        push_conflicts: 0
    });

};

exports.test_server_file_mangling_1 = function(test) {
    var completed = 0;
    var sync_data = {};
    var sl = SyncList({
        onComplete: function() {
            completed += 1;
        }
    });

    // some files on the server
    sl.test_server_state.files = {
        'aa@.txt': {content: 'Content', lastModification: 100, serverPath: 'aa-.txt'},
        'bbb.txt': {content: 'Content', lastModification: 100, serverPath: 'bbb.txt'},
        'ccc.txt': {content: 'Content', lastModification: 100, serverPath: 'ccc.txt'},
        'ddd.txt': {content: 'Content', lastModification: 100, serverPath: 'ddd.txt'}
    };

    sl.sync();

    test.assertEqual(completed, 1);
    test.assertEqual(sl.test_posted_query.length, 1);

    test.assertEqual(sl.test_server_state.fileNames().length, 4);
    test.assertEqual(sl.test_client_state.fileNames().length, 4);

    check_statuses(test, sl, {
        pull_added: 4,
        pull_modified: 0,
        pull_deleted: 0,
        pull_errors: 0,
        pull_conflicts: 0,

        push_added: 0,
        push_modified: 0,
        push_deleted: 0,
        push_errors: 0,
        push_conflicts: 0
    });


    // some files on the client
    sl.test_client_state.stepTime()
    sl.test_client_state.files['aa-.txt'] = {
        content: 'Content', lastModification: sl.test_client_state.timestamp
    };

    sl.sync();

    test.assertEqual(completed, 2);
    test.assertEqual(sl.test_posted_query.length, 2);

    test.assertEqual(sl.test_server_state.fileNames().length, 4);
    test.assertEqual(sl.test_client_state.fileNames().length, 5);

    check_statuses(test, sl, {
        pull_added: 0,
        pull_modified: 0,
        pull_deleted: 0,
        pull_errors: 0,
        pull_conflicts: 0,

        push_added: 0,
        push_modified: 0,
        push_deleted: 0,
        push_errors: 0,
        push_conflicts: 1
    });
    test.assertEqual(sl.sync_statuses.conflict.length, 0);


    sl.sync();

    test.assertEqual(completed, 3);
    test.assertEqual(sl.test_posted_query.length, 3);

    test.assertEqual(sl.test_server_state.fileNames().length, 4);
    test.assertEqual(sl.test_client_state.fileNames().length, 5);

    // from this point, the conflict will become permanent
    // (since no push will be attempted any more)
    check_statuses(test, sl, {
        pull_added: 0,
        pull_modified: 0,
        pull_deleted: 0,
        pull_errors: 0,
        pull_conflicts: 0,

        push_added: 0,
        push_modified: 0,
        push_deleted: 0,
        push_errors: 0,
        push_conflicts: 0
    });
    test.assertEqual(sl.sync_statuses.conflict.length, 1);

};

exports.test_server_file_mangling_2 = function(test) {
    var completed = 0;
    var sync_data = {};
    var sl = SyncList({
        onComplete: function() {
            completed += 1;
        }
    });

    // some files on the server
    sl.test_server_state.files = {
        'aa-.txt': {content: 'Content', lastModification: 100, serverPath: 'aa-.txt'},
        'bbb.txt': {content: 'Content', lastModification: 100, serverPath: 'bbb.txt'},
        'ccc.txt': {content: 'Content', lastModification: 100, serverPath: 'ccc.txt'},
        'ddd.txt': {content: 'Content', lastModification: 100, serverPath: 'ddd.txt'}
    };

    sl.sync();

    test.assertEqual(completed, 1);
    test.assertEqual(sl.test_posted_query.length, 1);

    test.assertEqual(sl.test_server_state.fileNames().length, 4);
    test.assertEqual(sl.test_client_state.fileNames().length, 4);

    check_statuses(test, sl, {
        pull_added: 4,
        pull_modified: 0,
        pull_deleted: 0,
        pull_errors: 0,
        pull_conflicts: 0,

        push_added: 0,
        push_modified: 0,
        push_deleted: 0,
        push_errors: 0,
        push_conflicts: 0
    });


    // some files on the client
    sl.test_client_state.stepTime()
    sl.test_client_state.files['aa@.txt'] = {
        content: 'Content', lastModification: sl.test_client_state.timestamp
    };

    sl.sync();

    test.assertEqual(completed, 2);
    test.assertEqual(sl.test_posted_query.length, 2);

    test.assertEqual(sl.test_server_state.fileNames().length, 4);
    test.assertEqual(sl.test_client_state.fileNames().length, 5);

    check_statuses(test, sl, {
        pull_added: 0,
        pull_modified: 0,
        pull_deleted: 0,
        pull_errors: 0,
        pull_conflicts: 0,

        push_added: 0,
        push_modified: 0,
        push_deleted: 0,
        push_errors: 0,
        push_conflicts: 1
    });
    test.assertEqual(sl.sync_statuses.conflict.length, 0);


    sl.sync();

    test.assertEqual(completed, 3);
    test.assertEqual(sl.test_posted_query.length, 3);

    test.assertEqual(sl.test_server_state.fileNames().length, 4);
    test.assertEqual(sl.test_client_state.fileNames().length, 5);

    // from this point, the conflict will become permanent
    // (since no push will be attempted any more)
    check_statuses(test, sl, {
        pull_added: 0,
        pull_modified: 0,
        pull_deleted: 0,
        pull_errors: 0,
        pull_conflicts: 0,

        push_added: 0,
        push_modified: 0,
        push_deleted: 0,
        push_errors: 0,
        push_conflicts: 0
    });
    test.assertEqual(sl.sync_statuses.conflict.length, 1);

};


