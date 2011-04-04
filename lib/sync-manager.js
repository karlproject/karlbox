const data = require("self").data;
const file = require("file");
const Request = require("request").Request;

const env = require("env");

// like setTimeout
function timeout(delay, func) {
    var timer = env.cc['@mozilla.org/timer;1']
            .createInstance(env.ci.nsITimer);
    timer.initWithCallback(func, delay,
            env.ci.nsITimer.TYPE_ONE_SHOT);
    return timer;
}

function SyncFile(base_dir, filename) {
    // Provide a "class" with a lot of the functionality enclosed,
    // to promote testing and clarity.

    // XXX This will later fail with subfolder support
    this.filename = filename;
    this.fullpath = file.join(base_dir, filename);
    this.fp = env.lf;
    this.fp.initWithPath(this.fullpath);

    // Extract some data about this file
    this.last_modified = this.fp.lastModifiedTime;
}

SyncFile.prototype.readEncoded = function () {
    // Read the contents into memory and base64 encode
    var win = env.wm.getMostRecentWindow('navigator:browser');
    var f = file.open(this.fullpath, 'rb');
    return win.btoa(f.read());
};

//  ################################

function SyncList(sync_map) {
    // Manage map of existing state, handle local changes, transmit

    // A mapping of paths to modification dates.  Will later come from
    // _load/_store for persistence.  The sync_map should look like:
    //   {
    //     '/path/to/aaa.txt': {
    //       status: "added",
    //       last_local: datetime,
    //       last_remote: datetime,
    //       full_fn: '/path/to/aaa.txt',
    //       fn: 'aaa.txt'
    //     },
    //     next item
    // The value dict should *not* contain any data about the file
    // that can't be gotten from the file itself, except the previous
    // modification time (to know if it has changed.
    this.sync_map = sync_map;
}

SyncList.prototype._load = function (sync_file) {
    // Helper function for loading the SyncList from storage
}

SyncList.prototype._store = function (sync_file) {
    // Helper function for saving the SyncList to storage
}

SyncList.prototype.push = function (sync_file) {
    // Get instances of SyncFile pushed on, process as needed

    var fp = sync_file.fullpath;
    var fn = sync_file.filename;
    var lm = sync_file.last_modified;
    var map_entry = this.sync_map[fp];   // Might be null

    if (!map_entry) {
        // Never been seen by our sync process
        this.sync_map[fp] = {
            status: "added",
            last_local: lm,
            last_remote: null,
            full_fn: fp,
            fn: fn
        };
        return;
    }

    // We've already seen this file, so it's in the sync_map
    var lr = map_entry.last_remote;
    if (map_entry.status == "added") {
        // We saw it, we added it, but it hasn't been sync'd
        // yet.  It might have changed locally, so update its lm.
        map_entry.last_remote = lm;
        return;
    }
    else if (map_entry.status == "syncd") {
        // We have sent this to the server so it should have
        // a last_remote.  If the file has been modified locally
        // since then, change its status and last_local
        if (lm != map_entry.last_local) {
            map_entry.status = "modified";
            map_entry.last_local = lm;
        }
    }
    else if (map_entry.status == "modified") {
        // Already in map, was previously determined to be
        // modified and thus made dirty.  Update modification just
        // in case it changed.
        map_entry.last_remote = lm;
        return;
    }
    else if (map_entry.status == "deleted") {
        // Un-sync'd changes think this file was deleted but now it
        // is back.  Let sync handle this one.
        return;
    }
    else {
        // Undefined, should never get here.  throw an exception
        throw new Error("Bogus sync status of: " + map_entry.status);
        return;
    }
}

SyncList.prototype.mark_deleted = function (dir_path) {
    // Given a directory on disk, find the file names that
    // are registered in the sync_map but are no longer on
    // disk.  Meaning, the user deleted them.  For those, put
    // them in the "deleted" status.

    for (var full_fn in this.sync_map) {
        if (!file.exists(full_fn)) {
            // Missing from disk, so mark as deleted
            this.sync_map[full_fn].status = "deleted";
        }
    }
};

SyncList.prototype.get_uploads = function () {
    // Return the list of items that need to be uploaded

    var matching = [];
    var item;
    var matching_statuses = ['added', 'modified'];
    for (var key in this.sync_map) {
        item = this.sync_map[key];
        if (matching_statuses.indexOf(item.status) > -1) {
            matching.push(item);
        }
    }
    return matching;
};

SyncList.prototype.prepare_sync = function () {
    // Build up the dictionary used as form data for the request. This
    // approach presumes a bunch of files uploaded at once, to prevent
    // conflict errors and not make async programming harder.  Makes
    // it easier to do one-alert server side for all the files.  But
    // has obvious drawbacks.

    var uploads = this.get_uploads();
    var deletes = []; // XXX fix this later

    var payload = {};
    var counter_suffix = 0;
    uploads.forEach(function (item, counter) {
        var sync_file = new SyncFile(env.base_dir, item.fn);
        payload["filename-" + counter] = item.fn;
        payload["binfile-" + counter] = sync_file.readEncoded();
    });

    return payload;
};

SyncList.prototype.sync = function () {
    // Get the payload for all the files and upload.  If successful,
    // put out a notification and update the map.

    var payload = this.prepare_sync();
    var url = 'http://localhost:6543/communities/default/files/new_upload_file.json';
    var karl = Request({
                url: url,
                content: payload,
                headers: {Authorization: 'Basic YWRtaW46YWRtaW4='},
                onComplete: function (response) {
                    env.log('finished: ' + response.text);
                }
            });

    karl.post();
}

SyncList.prototype.sync_old = function () {
    // Handle all uploads, deletes, and downloads

    var uploads = this.get_uploads();
    var deletes = []; // XXX fix this later

    var content;
    uploads.forEach(function (item) {
        var sync_file = new SyncFile(env.base_dir, item.fn);
        var txt = sync_file.readEncoded();
        content = {
            binfile: txt,
            filename: item.fn
        };
        var url = 'http://localhost:6543/communities/default/files/new_upload_file.json';
        var karl = Request({
                    url: url,
                    content: content,
                    headers: {Authorization: 'Basic YWRtaW46YWRtaW4='}
                });
        karl.post();
        timeout(100000, function () {
            xyz;
            console.log("\n#### PostedXXX");
        });
        console.log("\nPosted");
    })

};

exports.SyncFile = SyncFile;
exports.SyncList = SyncList;