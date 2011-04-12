const file = require("file");
const Request = require("request").Request;
const {Cc,Ci,Cr} = require("chrome");


function readfile(path) {
    var f = file.open(path, 'rb');
    var txt = f.read();
    return txt
}

function mimetype(path) {
    var moz_file = Cc['@mozilla.org/file/local;1']
             .createInstance(Ci.nsILocalFile);
    moz_file.initWithPath(path);
    // Try to determine the MIME type of the file
    var mimeType = "text/plain";
    try {
        var mimeService = Cc["@mozilla.org/mime;1"]
            .getService(Ci.nsIMIMEService);
        mimeType = mimeService.getTypeFromFile(moz_file); // file is an nsIFile instance
    } catch(e) { /* eat it; just use text/plain */ }
    return mimeType
}

function btoa(txt) {
    // XXX Hacks to get to a DOMWindow so we can use btoa
    var wm = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);
    var win =  wm.getMostRecentWindow('navigator:browser');
    var txt = win.btoa(txt);
    return txt;
}


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
     *     onComplete:    onComplete (optional)
     * });
     * mp.post();
     *
     */
    return new exports._MultiPoster(options);
};
exports._MultiPoster = function(options) {
    var self = this;
    this.options = options;
    // plugs are for testing only
    this.plugs = {
        Request: Request,
        readfile: readfile,
        mimetype: mimetype,
        btoa: btoa
    };
};

/* public */

exports._MultiPoster.prototype.post = function() {
    this.json_results = [];
    this._post_next(0);
};

/* private */

exports._MultiPoster.prototype._post_next = function(next_item) {
    var self = this;
    var fileNames = this.options.fileNames;
    if (next_item < fileNames.length) {
        // Post the next file.
        this._post_file(fileNames[next_item], function(response) {
            // store results
            // null here means that there was an error
            var json_result = response.json
            self.json_results.push(json_result);
            // Continuation
            self._post_next(next_item + 1);
        });
    } else {
        // Finished.
        if (this.options.onComplete) {
            this.options.onComplete(self.json_results);
        }
    }
};

exports._MultiPoster.prototype._post_file = function(fileName, callback) {
    var path = file.join(this.options.baseDir, fileName);
    var txt = this.plugs.readfile(path);
    txt = this.plugs.btoa(txt);
    var mimeType = this.plugs.mimetype(path);

    var request = this.plugs.Request({
        url: this.options.url,
        content: {
            binfile: txt,
            filename: fileName,
            mimetype: mimeType
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
}

