const LocalRoot = require("local-utils").LocalRoot;
const Request = require("request").Request;

exports.MultiPoster = function(options) {
    /*
     * A MultiPoster is similar to Request, except that it serializes
     * the upload of multiple files.
     * (Serialization is needed to avoid conflict errors on the folder
     * that contains the files.)
     *
     * var mp = MultiPoster({
     *     url:           url to post to
     *     authHeader:    authorization header (Authorization_
     *     baseDir:       base directory for files
     *     fileNames:     file names (relative to the base_dir)
     *     onEachResult:  onEachResult (optional)
     *     onComplete:    onComplete (optional)
     * });
     * mp.post();
     *
     */
    return new exports._MultiPoster(options);
};
exports._MultiPoster = function(options) {
    this.options = options;
    // plugs are for testing only
    this.plugs = {
        Request: Request,
        LocalRoot: LocalRoot,
    };
};

/* public */

exports._MultiPoster.prototype.post = function() {
    this.local = this.plugs.LocalRoot({
        baseDir: this.options.baseDir
    });
    this._post_next(0);
};

/* private */

exports._MultiPoster.prototype._post_next = function(next_item) {
    var self = this;
    var fileNames = this.options.fileNames;
    if (next_item < fileNames.length) {
        var fileName = fileNames[next_item];
        // Post the next file.
        this._post_file(fileName, function(response) {
            // handle the result
            if (self.options.onEachResult) {
                self.options.onEachResult(fileName, response);
            }
            // Continuation
            self._post_next(next_item + 1);
        });
    } else {
        // Finished.
        if (this.options.onComplete) {
            this.options.onComplete();
        }
    }
};

exports._MultiPoster.prototype._post_file = function(fileName, callback) {
    var txt = this.local.readFile(fileName);
    txt = this.local.btoa(txt);
    var mimeType = this.local.mimeType(fileName);

    var request = this.plugs.Request({
        url: this.options.url,
        content: {
            binfile: txt,
            filename: fileName,
            mimetype: mimeType
            // XXX syncedRemote
        },
        headers: {
            Authorization: this.options.authHeader
        },
        onComplete: function (response) {
            if (callback) {
                callback(response);
            }
        }
    });
    request.post();
};


exports.MultiGetter = function(options) {
    /*
     * A MultiGetter is similar to Request, except that it serializes
     * the download of multiple files.
     *
     * var mp = MultiGetter({
     *     urlBase:       base url of the folder
     *     urlMethod:     method name of the download
     *     authHeader:    authorization header (Authorization_
     *     baseDir:       base directory for files
     *     syncItems:     sync items to download. Items are dictionaries containing:     
     *        fileName:   file name as known by the client (relative to the base_dir)
     *        serverPath: the physical server path of the file, to be used to download
     *     onEachResult:  onEachResult (optional)
     *     onComplete:    onComplete (optional)
     * });
     * mp.post();
     *
     */
    return new exports._MultiGetter(options);
};
exports._MultiGetter = function(options) {
    this.options = options;
    // plugs are for testing only
    this.plugs = {
        Request: Request,
    };
};

/* public */

exports._MultiGetter.prototype.get = function() {
    this._get_next(0);
};

/* private */

exports._MultiGetter.prototype._get_next = function(next_item) {
    var self = this;
    var syncItems = this.options.syncItems;
    if (next_item < syncItems.length) {
        // Post the next file.
        var syncItem = syncItems[next_item];
        this._get_file(syncItem.serverPath, function(response) {
            // handle the result
            if (self.options.onEachResult) {
                self.options.onEachResult(syncItem, response);
            }
            // Continuation
            self._get_next(next_item + 1);
        });
    } else {
        // Finished.
        if (this.options.onComplete) {
            this.options.onComplete();
        }
    }
};

exports._MultiGetter.prototype._get_file = function(serverPath, callback) {
    var url = this.options.urlBase;
    if (url.length > 0 && url.charAt(url.length - 1) != '/') {
        url += '/';
    }
    url += serverPath + '/' + this.options.urlMethod;
    var request = this.plugs.Request({
        url: url,
        content: {
        },
        headers: {
            Authorization: this.options.authHeader
        },
        onComplete: function (response) {
            if (callback) {
                callback(response);
            }
        }
    });
    request.get();
};

