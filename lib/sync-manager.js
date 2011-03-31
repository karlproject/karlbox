const data = require("self").data;
const file = require("file");

const env = require("env");


function SyncFile(base_dir, filename) {
    // Provide a "class" with a lot of the functionality enclosed,
    // to promote testing and clarity.

    // XXX This will later fail with subfolder support
    this.fullpath = file.join(base_dir, filename);
    this.fp = env.nsILocalFile;
    this.fp.initWithPath(this.fullpath);

    // Extract some data about this file
    this.last_modified = this.fp.lastModifiedTime;
}

SyncFile.prototype.readEncoded = function () {
    // Read the contents into memory and base64 encode
    var win = nsIWindowMediator
            .getMostRecentWindow('navigator:browser');
    var f = file.open(this.fullpath, 'rb');
    return win.btoa(f.read());
}

function SyncList(sync_map) {
    // Manage map of existing state, handle local changes, transmit

    // A mapping of paths to modification dates
    this.sync_map = sync_map;
}

SyncList.prototype.readEncoded = function () {

}

exports.SyncFile = SyncFile;
exports.SyncList = SyncList;