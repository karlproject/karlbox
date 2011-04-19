
const Request = require("request").Request;
const MultiPoster = require('remote-utils').MultiPoster;
const MultiGetter = require('remote-utils').MultiGetter;
const LocalRoot = require('local-utils').LocalRoot;

const env = require("env");


exports.SyncList = function(options) {
    /*
     * A SyncList is the main structure responsible for the syncing. 
     * Manage map of existing state, handle local changes, transmit
     *
     * var sl = SyncList({
     *     baseDir:         base directory for files
     *     syncData:        an initial sync data (optional)
     *
     *     // the followings are optional on the setup, and can be specified via setOptions:
     *
     *     baseUrl:         the base url to work on, like: http://karl.soros.org
     *     baseFolderPath:  the path section of the base folder, default communities/default/files
     *     username:        authentication username
     *     password:        authentication password
     *
     *     onComplete:      onComplete (optional)
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
    this.setOptions({syncData: options.syncData || {}});
    // plugs are for testing only
    this.plugs = {
        Request: Request,
        LocalRoot: LocalRoot,
        MultiPoster: MultiPoster,
        MultiGetter: MultiGetter
    };
};


exports._SyncList.prototype.setOptions = function (options) {
    // Sets the server url and authentication to be used
    //     baseUrl:         the base url to work on, like: http://karl.soros.org
    //     baseFolderPath:  the path section of the base folder, like: communities/default/files
    //     username:        authentication username
    //     password:        authentication password
    //     syncData:        new sync data 
    //     baseDir:         base directory
    

    //     check that we are not locked
    if (this.locked) {
        throw new Error('Sync is in progress.');
    }
    changes = {
        baseUrl: false,
        baseFolderPath: false,
        username: false,
        password: false,
        syncData: false,
        baseDir: false
    }
    // set the options, check for excess properties
    for (var key in options) {
        if (options.hasOwnProperty(key)) {
            if (changes[key] !== false) {
                throw new Error('Excess property in SyncList.setOptions: ' + key);
            }
            changes[key] = true;
            // store it in the options
            this.options[key] = options[key];
        }
    }
    // process the options as needed
    if (this.serverUrl !== undefined && (changes.baseUrl || changes.baseFolderPath)) {
        this._processServerUrl();
    }
    if (this.authHeader !== undefined  && (changes.username || changes.password)) {
        this._processServerCredentials();
    }
    if (changes.syncData) {
        if (options.syncData.map === undefined) {
            options.syncData.map = {};
        }
        if (options.syncData.syncedRemote === undefined) {
            options.syncData.syncedRemote = '';
        }
        this.sync_map = options.syncData.map;
    }

};

exports._SyncList.prototype._processServerUrl = function () {
    var url = this.options.baseUrl || '';
    if (url.length > 0 && url.charAt(url.length - 1) != '/') {
        url += '/';
    }
    var path = this.options.baseFolderPath || '';
    if (path.length > 0 && path.charAt(0) == '/') {
        path = path.substring(1);
    }
    if (path.length > 0 && path.charAt(path.length - 1) != '/') {
        path += '/';
    }
    this.serverUrl = url + path;
    env.log('SERVER URL: ' + this.serverUrl); 
};

exports._SyncList.prototype._processServerCredentials = function () {
    var username = this.options.username || '';
    var password = this.options.password || '';
    var hash  = username + ':' + password;
    this.authHeader = 'Basic ' + this.localRoot.btoa(hash);
    env.log('AUTH HEADER: ' + this.authHeader); 
};



exports._SyncList.prototype.prepareUpdate = function () {
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
                map_entry.currentLocal = null;
                if (map_entry.syncedLocal) { 
                    map_entry.status = 'deleted';
                    // XXX we just mark them, no more handling currently
                    continue;
                }
            } else {
                // We have this file, update its modification
                var lastModified = this.localRoot.lastModified(fileName);
                map_entry.currentLocal = lastModified;
            }

            // check if the file is dirty locally or remotely?
            var dirty_locally = (
                map_entry.syncedLocal == null && map_entry.currentLocal != null ||
                map_entry.currentLocal == null && map_entry.syncedLocal != null ||
                map_entry.currentLocal > map_entry.syncedLocal
            );
            var dirty_remotely = (map_entry.syncedRemote == null ||
                map_entry.syncedRemote == null && map_entry.currentRemote != null ||
                map_entry.currentRemote == null && map_entry.syncedRemote != null ||
                map_entry.currentRemote > map_entry.syncedRemote
                );

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
    var s = this.sync_statuses = {
        pull: [],
        push: [],
        deleted: [],
        conflict: [],
        synced: []
    };
    for (var fileName in this.sync_map) {
        if (this.sync_map.hasOwnProperty(fileName)) {
            var map_entry = this.sync_map[fileName];
            if (map_entry.status == "modified" || map_entry.status == "added") {
                s.push.push(fileName);
            } else {
                s[map_entry.status].push(fileName);
            }
        }
    }
    env.log('Sync map by statuses: pull: ' + s.pull.length +
        ', push: ' + s.push.length +
        ', deleted: ' + s.deleted.length +
        ', conflict: ' + s.conflict.length +
        ', synced: ' + s.synced.length
    );
};

exports._SyncList.prototype.finishQuery = function (response) {
    var self = this;
    // Process the results of the query
    var json_result = response.json
    if (json_result && json_result.result == "OK") {
        // Success. 
        // Update the global timestamp. This means: we know the
        // changes on the server until this point.
        this.options.syncData.syncedRemote = json_result.timestamp_to;
        
        // Let's update the sync map as well.
        json_result.changed.forEach(function(item) {
            var map_entry = self.sync_map[item.fileName];
            if (map_entry !== undefined) {
                // We have this file already
                //
                // This will mark the item for 'pull' - unless, it
                // already has a such high syncedRemote, because it
                // was this client that uploaded the file and it has
                // not changed on the server, since then:
                map_entry.currentRemote = item.currentRemote;
            } else {
                // The file will be new for us
                map_entry = self.sync_map[item.fileName] = {
                    status: "pull",
                    syncedLocal: null,
                    currentLocal: null,
                    syncedRemote: null,
                    currentRemote: item.currentRemote,
                    fileName: item.fileName
                };
            }
        });
    } else {
        // XXX Failed, what to do?
        env.log("Ajax to new_query_file.json failed, result: " + json_result);
    }
};

exports._SyncList.prototype.finishPull = function (fileName, response) {
    var self = this;
    // We come here if one download is complete
    // (with or without error)
    // We update our sync map accordingly

    var map_entry = this.sync_map[fileName];

    // store the response status as reference
    // (gives information about if an error happened)
    var response_status = response && response.status || 'ERROR';
    map_entry.pullStatus = response_status;

    if (response_status == '200') {
        env.log('Downloaded', fileName, response_status);
        var txt = response.text;

        // We need to check if by chance, there has been a change in this file
        var orig_lastModified;
        if (this.localRoot.exists(fileName)) {
            orig_lastModified = this.localRoot.lastModified(fileName);
        } else {
            // file is not present
            lastModified = null;
        }
        var dirty_locally = (
            orig_lastModified == null && map_entry.currentLocal != null ||
            map_entry.currentLocal == null && orig_lastModified != null ||
            orig_lastModified > map_entry.currentLocal
        )

        if (dirty_locally) {
            // we need to bring this file to conflict
            pullStatus = 'conflicts';
        } else {

            this.localRoot.writeFile(fileName, txt);
            map_entry.syncedRemote = map_entry.currentRemote;
            // We mark that this file is not up-to-date locally
            var lastModified = this.localRoot.lastModified(fileName);
            map_entry.currentLocal = lastModified;
            map_entry.syncedLocal = lastModified;
            map_entry.pullStatus = '200';

            if (orig_lastModified === null) {
                pullStatus = 'added';
            } else {
                pullStatus = 'modified';
            }
        }
    } else {
        env.log('Download ERROR', fileName, response_status);
        pullStatus = 'errors';
    }
    return pullStatus;
};

exports._SyncList.prototype.finishPush = function (fileName, response) {
    var self = this;
    // We come here if one upload is complete
    // (with or without error)
    // We update our sync map accordingly

    var item = response.json;
    var map_entry = this.sync_map[fileName];
    // We always store the last status on the sync item
    // (gives information about if an error happened)
    map_entry.pushStatus = item;
    if (item !== null && item.result == 'OK') {
        var pushStatus;
        // The upload succeeded.
        env.log('upload ', item.result, item.status, item.filename);
        // The server has told us the current timestamp after
        // it stored the file with success.
        // We must book this, to avoid that we receive the file
        // the next time we query the server for pulls.
        map_entry.currentRemote = item.lastremote;
        map_entry.syncedRemote = item.lastremote;
        // We also note that we synced until the current
        // local timestamp.
        map_entry.syncedLocal = map_entry.currentLocal;
        // Update the information about the results.
        if (item.status == 'added') {
            pushStatus = 'added';
        } else if (item.status == 'modified') {
            pushStatus = 'modified';
        } else {
            // should not arrive here...
            throw new Error('Invalid sync item status');
        }
    } else if (item !== null && item.result == 'CONFLICT') {
        // The server told us there is a conflict already
        // so let's mark the sync entry accordingly.
        map_entry.status = 'conflict';
        pushStatus = 'conflicts';
    } else {
        // a network error.
        env.log('upload ERROR', fileName);
        // The file will be an upload candidate in the next round,
        // so we keep everything intact
        pushStatus = 'errors';
    }
    return pushStatus;
};

exports._SyncList.prototype.sync = function () {
    // Handle all uploads, deletes, and downloads
    var self = this;
    
    // Make sure we are only running once.
    if (this.locked) {
        throw new Error('Sync is in progress.');
    }
    this.locked = true;

    this.localRoot = this.plugs.LocalRoot({
        baseDir: this.options.baseDir
    });

    // check cleanness
    if (! this.localRoot.checkRoot(this.options.syncData.hash)) {
        throw new Error('Local directory does not belong to this sync manager');
    }

    // process server options (for first time only)
    if (this.serverUrl === undefined || this.authHeader === undefined) {
        this._processServerUrl();
        this._processServerCredentials();
    }

    // Make query to know all changes since last update
    var request = this.plugs.Request({
        url: this.serverUrl + 'new_query_file.json',
        content: {
            timestampfrom: this.options.syncData.syncedRemote
        },
        headers: {
            Authorization: this.authHeader
        },
        onComplete: function (response) {
            self.finishQuery(response);

            // CONTINUATION
            env.log("Query finished - getting to pull phase");

            self.prepareUpdate();

            // update this.sync_statuses
            self.updateSyncStatuses();

            // We will store global information about the ongoing process,
            // with the purpose of notifying the user about the success.
            // These arrays will all contain fileNames.
            self.pullResults = {added: [], modified: [], deleted: [], errors: [], conflicts: []};
            self.pushResults = {added: [], modified: [], deleted: [], errors: [], conflicts: []};

            var getter = self.plugs.MultiGetter({
                urlBase: self.serverUrl,
                urlMethod: 'dl',
                authHeader: self.authHeader,
                baseDir: self.options.baseDir,
                fileNames: self.sync_statuses.pull,
                onEachResult: function(fileName, response) {
                    var pull_status = self.finishPull(fileName, response);
                    self.pullResults[pull_status].push(fileName);
                },
                onComplete: function() {
                    
                    // CONTINUATION
                    env.log("All pulls finished - getting to push phase");

                    // Initiate pushing of the files we need to
                    var error_map = {};
                    var poster = self.plugs.MultiPoster({
                        url: self.serverUrl + 'new_upload_file.json',
                        authHeader: self.authHeader,
                        baseDir: self.options.baseDir,
                        fileNames: self.sync_statuses.push,
                        onEachResult: function(fileName, response) {
                            var push_status = self.finishPush(fileName, response);
                            self.pushResults[push_status].push(fileName);
                        },
                        onComplete: function() {
                            
                            // CONTINUATION
                            env.log('Synchronization completed.')
    
                            // remove the lock
                            self.locked = false;

                            // Finished = let's notify our caller
                            if (self.options.onComplete) {
                                self.options.onComplete.call(self);
                            }

                        }
                    });
                    poster.post();
                }
            });
            getter.get();
        }
    });
    request.post();
};

