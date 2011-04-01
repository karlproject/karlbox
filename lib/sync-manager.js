const data = require("self").data;
const file = require("file");

const env = require("env");


function SyncFile(base_dir, filename) {
    // Provide a "class" with a lot of the functionality enclosed,
    // to promote testing and clarity.

    // XXX This will later fail with subfolder support
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
    //       last_remote: datetime
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
    var lm = sync_file.last_modified;
    var map_entry = this.sync_map[fp];   // Might be null

    if (!map_entry) {
        // Never been seen by our sync process
        this.sync_map[fp] = {
            status: "added",
            last_local: lm,
            last_remote: null
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
        // is back.  No idea what to do here.
        throw blah;
        return;
    }
    else {
        // Undefined, should never get here.  throw an exception
        throw blah;
        return;
    }
}

SyncList.prototype.get_pending = function () {
    // Return the list of items that need to be transmitted.
    // A SyncFile is "pending" if its this.last_remote is
    // null, meaning, we haven't recorded the server-side
    // last modification datetime.
}

exports.SyncFile = SyncFile;
exports.SyncList = SyncList;