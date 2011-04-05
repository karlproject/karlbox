const file = require("file");
const Request = require("request").Request;


function readfile(path) {
    var f = file.open(path, 'rb');
    var txt = f.read();
    return txt
}

function btoa(txt) {
    // XXX Hacks to get to a DOMWindow so we can use btoa
    var wm = env.nsIWindowMediator;
    var win =  wm.getMostRecentWindow('navigator:browser');
    var txt = win.btoa(txt);
    //console.log('Read', path, ', length=', txt.length);
}


exports.MultiPoster = function(options) {
    /*
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
        btoa: btoa
    };
};

/* public */

exports._MultiPoster.prototype.post = function() {
    this._post_next(0);
};

/* private */

exports._MultiPoster.prototype._post_next = function(next_item) {
    var self = this;
    var fileNames = this.options.fileNames;
    if (next_item < fileNames.length) {
        // Post the next file.
        this._post_file(fileNames[next_item], function() {
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
    var path = file.join(this.options.baseDir, fileName);
    var txt = this.plugs.readfile(path);
    txt = this.plugs.btoa(txt);
    var request = this.plugs.Request({
        url: this.options.url,
        content: {
            binfile: txt,
            filename: fileName
        },
        headers: {
            Authorization: this.options.authHeader
        },
        onComplete: function (response) {
            //console.log('finished: ' + response.text);
            if (callback) {
                callback();
            }
        }
    });
    request.post();
}


/*
exports.send = function(changes) {
    var fileNames = [];
    changes.added.forEach(function(item) {
        fileNames.append(item.name);
    });
    changes.modified.forEach(function(item) {
        fileNames.append(item.name);
    });
    var poster = MultiPoster({
        url: 'http://localhost:6543/communities/default/files/new_upload_file.json',
        authHeader: 'Basic YWRtaW46YWRtaW4=',
        baseDir: env.base_dir,
        fileNames: fileNames
    });
    poster.post(null);
};
*/

