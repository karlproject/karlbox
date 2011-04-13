const data = require("self").data;
const file = require("file");
const Request = require("request").Request;
const MultiPoster = require('remote-utils').MultiPoster;
const LocalRoot = require('local-utils').LocalRoot;

const env = require("env");


exports.SyncList = function(options) {
    /*
     * A SyncList is the main structure responsible for the syncing. 
     * Manage map of existing state, handle local changes, transmit
     *
     * var sl = SyncList({
     *     baseDir:       base directory for files
     *     syncMap:       an initial sync map (optional)
     *     onComplete:    onComplete (optional)
     * });
     *
     * sl.sync();
     *
     *
     * A mapping of paths to modification dates.  Will later come from
     * _load/_store for persistence.  The sync_map should look like:
     *   {
     *     'aaa.txt': {
     *       status: "added",
     *       currentLocal: current (highest) local file timestamp,
     *       currentRemote: current (highest) server timestamp,
     *       syncedLocal: local file timestamp the item is synced up to,
     *       syncedRemote: server timestamp the item is synced up to,
     *       fileName: 'aaa.txt'
     *     },
     *     next item
     *
     * The key is the file path _relative_ to our local sync directory.
     *
     * Why do we need a local and a remote timestamp as well?
     *
     * - because, the modification of a file will differ locally
     *   and on the remote server, due to the update process
     *
     * - because, the local time and remote time may differ (system
     *   clocks can be off, and there are timezones too)
     *
     * Why do we need a current and synced timestamp?
     *
     * - We only need the syncedLocal and syncedRemote timestamps
     *   that tells us the local and the remote timestamp of the file
     *   last synchronized.
     *
     * - The currentLocal and currentRemote are (re-)generated during
     *   the sync process. They are used to decide the status of
     *   a file.
     *
     * status: added, modified, synced, pull, conflict
     *
     * pushStatus: status of the last push server operation
     * pullStatus: status of the last pull server operation
     *
     * - these are stored that we can get some info about server errors.
     *
     *
     *
     * Example for a flow of state changes:
     *
     *
     * status: added
     *
     * syncedLocal == null
     * currentLocal == FILEMOD
     * syncedRemote == null
     * currentRemote == null
     *
     * status: synced
     *
     * syncedLocal == FILEMOD
     * currentLocal == FILEMOD
     * syncedRemote == server_time
     * currentRemote == server_time
     * 
     * status: modified
     *
     * syncedLocal == FILEMOD
     * currentLocal == FILEMOD+1
     * syncedRemote == server_time
     * currentRemote == server_time
     *
     *
     * status: synced
     *
     * syncedLocal == FILEMOD+1
     * currentLocal == FILEMOD+1
     * syncedRemote == server_time+1
     * currentRemote == server_time+1
     *
     * status: pull
     *
     * syncedLocal == FILEMOD+1
     * currentLocal == FILEMOD+1
     * syncedRemote == server_time+1
     * currentRemote == server_time+2
     *
     *
     * status: synced
     *
     * syncedLocal == FILEMOD+2
     * currentLocal == FILEMOD+2
     * syncedRemote == server_time+2
     * currentRemote == server_time+2
     *
     * (or)
     * status: conflict
     *
     * syncedLocal == FILEMOD+1
     * currentLocal == FILEMOD+2
     * syncedRemote == server_time+1
     * currentRemote == server_time+2
     *
     *
     */
    return new exports._SyncList(options);
};
exports._SyncList = function(options) {
    this.options = options;
    this.sync_map = options.syncMap || {};
    // plugs are for testing only
    this.plugs = {
        //Request: Request,
        LocalRoot: LocalRoot,
        MultiPoster: MultiPoster
    };
};

exports._SyncList.prototype._load = function (sync_file) {
    // Helper function for loading the SyncList from storage
};

exports._SyncList.prototype._store = function (sync_file) {
    // Helper function for saving the SyncList to storage
};

exports._SyncList.prototype.prepareUpdateLocal = function () {
    var self = this;
    // Prepare for local update.
    
    // Get the list of all the files on the filesystem
    var fileNames = this.localRoot.listFiles();

    // Look for files we know already:
    // and regenerate statuses based on the timestamp information.
    for (var fileName in this.sync_map) {
        if (this.sync_map.hasOwnProperty(fileName)) {
            var map_entry = this.sync_map[fileName];
            
            // check deletions
            if (fileNames.indexOf(fileName) == -1) {
                map_entry.status = 'deleted';
                // XXX we just mark them, no more handling currently
                continue;
            }

            // We have this file, update its modification
            var lastModified = this.localRoot.lastModified(fileName);
            map_entry.currentLocal = lastModified;

            // check if the file is dirty locally or remotely?
            var dirty_locally = (map_entry.syncedLocal == null ||
                    map_entry.currentLocal > map_entry.syncedLocal);
            var dirty_remotely = (map_entry.syncedLocal == null ||
                    map_entry.currentRemote > map_entry.syncedRemote);

            if (dirty_locally && dirty_remotely) {
                // this file is in conflict
                map_entry.status = 'conflict';
                // XXX we just mark them, no more handling currently
                continue;
            }

            if (dirty_locally) {
                map_entry.status = 'modified';
                continue;
            }

            if (dirty_remotely) {
                map_entry.status = 'pull';
                continue;
            }

            // everything else is synced
            map_entry.status = 'synced';
        }
    }

    // Look for files recently added
    fileNames.forEach(function(fileName) {
        if (self.sync_map[fileName] === undefined) {
            // An added file.
            var lastModified = self.localRoot.lastModified(fileName);
            self.sync_map[fileName] = {
                status: "added",
                syncedLocal: null,
                currentLocal: lastModified,
                syncedRemote: null,
                currentRemote: null,
                fileName: fileName
            };
        }
    });

};

exports._SyncList.prototype.updateSyncStatuses = function () {
    // Just update the sync statuses into this.sync_statuses
    // e.g. this.sync_statuses.pull will contain fileNames with status modified or added
    //      this.sync_statuses.SSS will containi fileNames with status SSS
    this.sync_statuses = {
        pull: [],
        push: [],
        conflict: [],
        synced: []
    };
    for (var fileName in this.sync_map) {
        if (this.sync_map.hasOwnProperty(fileName)) {
            var map_entry = this.sync_map[fileName];
            if (map_entry.status == "modified" || map_entry.status == "added") {
                this.sync_statuses.push.push(fileName);
            } else {
                this.sync_statuses[map_entry.status].push(fileName);
            }
        }
    }
};


exports._SyncList.prototype.finishUpdateLocal = function (fileNames, json_results) {
    var self = this;
    // We come here if all the uploads are complete
    // (with or without error)
    // We update our sync map accordingly
    var results = this.pushResults = {added: [], modified: [], deleted: [], errors: [], conflicts: []};
    env.log('finished uploads:', json_results.length);
    json_results.forEach(function(item, i) {
        var fileName = fileNames[i];
        var sync_item = self.sync_map[fileName];
        // We always store the last status on the sync item
        // (gives information about if an error happened)
        sync_item.pushStatus = item;
        if (item !== null && item.result == 'OK') {
            // The upload succeeded.
            env.log('upload #', i, item.result, item.status, item.filename);
            // The server has told us the current timestamp after
            // it stored the file with success.
            // We must book this, to avoid that we receive the file
            // the next time we query the server for pulls.
            sync_item.currentRemote = item.lastremote;
            sync_item.syncedRemote = item.lastremote;
            // We also note that we synced until the current
            // local timestamp.
            sync_item.syncedLocal = sync_item.currentLocal;
            // Update the information about the results.
            if (item.status == 'added') {
                results.added.push(fileName);
            } else if (item.status == 'modified') {
                results.modified.push(fileName);
            } else {
                // should not arrive here...
                throw new Error('Invalid sync item status');
            }
        } else if (item !== null && item.result == 'CONFLICT') {
            // The server told us there is a conflict already
            // so let's mark the sync entry accordingly.
            sync_item.status = 'conflict';
            results.conflicts.push(fileName);
        } else {
            // a network error.
            env.log('upload #', i, "ERROR", fileName);
            // The file will be an upload candidate in the next round,
            // so we keep everything intact
            results.errors.push(fileName);

        }
        // Update the sync item with the info we received from the server
    });

    // Finished = let's notify our caller
    if (this.options.onComplete) {
        this.options.onComplete.call(this);
    }
};

exports._SyncList.prototype.sync = function () {
    // Handle all uploads, deletes, and downloads
    var self = this;
    
    this.localRoot = this.plugs.LocalRoot({
        baseDir: this.options.baseDir
    });

    this.prepareUpdateLocal();

    // update this.sync_statuses
    this.updateSyncStatuses();

    // Initiate pushing of the files we need to
    var fileNames = this.sync_statuses.push;
    var error_map = {};
    var poster = this.plugs.MultiPoster({
        url: 'http://localhost:6543/communities/default/files/new_upload_file.json',
        authHeader: 'Basic YWRtaW46YWRtaW4=',
        baseDir: this.options.baseDir,
        fileNames: fileNames,
        onComplete: function(json_results) {
            if (fileNames.length != json_results.length) {
                throw new Error('Fatal error in sync');
            }
            self.finishUpdateLocal(fileNames, json_results);
        }
    });
    poster.post();
};

