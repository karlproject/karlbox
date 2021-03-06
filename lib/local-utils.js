const file = require("file");
const Request = require("request").Request;
const {Cc,Ci,Cr} = require("chrome");


exports.LocalRoot = function(options) {
    /*
     * A LocalRoot can query information about any file on the local
     * filesystem.
     *
     * Its purpose is to provide an access to everything we need
     * to do with files. It is not meant to store any information
     * about the files.
     * 
     * All operations that request a fileName, require a file
     * path relative to the base directory.
     *
     * var lf = LocalRoot({
     *     baseDir:       base directory for files
     * });
     *
     * fileNames = lf.listFiles();
     *
     * mimetype = lf.mimeType(fileName);
     *
     * last_modification = lf.lastModified(fileName);
     *
     * txt = lf.readFile(fileName);
     *
     * encoded = ls.btoa(txt);
     *
     * lf.writeFile(fileName, txt);
     *
     */
    return new exports._LocalRoot(options);
};
exports._LocalRoot = function(options) {
    this.options = options;
};
 
var fn_karlmagic = '.KARLMAGIC';

/* public */

exports._LocalRoot.prototype.existsRoot = function() {
    // Checks if the root exists
    var exists = file.exists(this.options.baseDir);
    return exists
    
};

exports._LocalRoot.prototype.checkRoot = function(hash) {
    // Checks if the root exists, and marked with the correct hash
    if (! this.existsRoot()) {
        return false;
    }
    var path = this._getPath(fn_karlmagic);
    var exists = file.exists(path) && file.isFile(path);
    if (! exists) {
        return false;
    }
    var f = file.open(path, 'r');
    var txt = f.read();
    if (txt && txt.charAt(txt.length - 1) == '\n') {
        txt = txt.substring(0, txt.length - 1);
    }
    return txt == hash;
};

exports._LocalRoot.prototype.createRoot = function(hash) {
    // Creates the root, and marks it with the correct hash
    if (this.existsRoot()) {
        throw new Error('Root already exists.');
    }
    file.mkpath(this.options.baseDir);
    var path = this._getPath(fn_karlmagic);
    var f = file.open(path, 'w');
    f.write(hash);
    f.close();
};

exports._LocalRoot.prototype.listFiles = function() {
    var items = file.list(this.options.baseDir);
    // Filter out anything like .DS_Store
    function filtered (element, index, array) {
        if (element.length > 0 && element.charAt(0) == '.') {
            return;
        }
        return true;
    }
    var content = items.filter(filtered);
    return content;
};

exports._LocalRoot.prototype.exists = function(fileName) {
    var path = this._getPath(fileName);
    var exists = file.exists(path) && file.isFile(path);
    return exists
}

exports._LocalRoot.prototype.readFile = function(fileName) {
    var path = this._getPath(fileName);
    var f = file.open(path, 'rb');
    var txt = f.read();
    return txt
}

exports._LocalRoot.prototype.writeFile = function(fileName, txt) {
    var path = this._getPath(fileName);
    var f = file.open(path, 'wb');
    f.write(txt);
}

exports._LocalRoot.prototype.mimeType = function(fileName) {
    var path = this._getPath(fileName);
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
};

exports._LocalRoot.prototype.lastModified = function(fileName) {
    var path = this._getPath(fileName);
    var moz_file = Cc['@mozilla.org/file/local;1']
             .createInstance(Ci.nsILocalFile);
    moz_file.initWithPath(path);
    // Extract last modification of the file
    var last_modified = moz_file.lastModifiedTime;
    return last_modified;
};

exports._LocalRoot.prototype.btoa = function(txt) {
    // XXX Hacks to get to a DOMWindow so we can use btoa
    var wm = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);
    var win =  wm.getMostRecentWindow('navigator:browser');
    var txt = win.btoa(txt);
    return txt;
};

/* private */

exports._LocalRoot.prototype._getPath = function(fileName) {
    // returns the phisical path
    var path = file.join(this.options.baseDir, fileName);
    return path
};

