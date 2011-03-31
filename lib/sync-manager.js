const data = require("self").data;
const file = require("file");

const env = require("env");


function WrappedFile(base_dir, filename) {
    // Provide a "class" with a lot of the functionality enclosed,
    // to promote testing and clarity.

    // XXX This will later fail with subfolder support
    this.fullpath = file.join(base_dir, filename);
    this.fp = env.nsILocalFile;
    this.fp.initWithPath(this.fullpath);

    // Extract some data about this file
    this.last_modified = this.fp.lastModifiedTime;
}
WrappedFile.prototype.readEncoded = function () {
    // Read the contents into memory and base64 encode
    var wm = env.nsIWindowMediator;
    var win = wm.getMostRecentWindow('navigator:browser');

    var path = file.join(base_dir, file_name);
    var f = file.open(path, 'rb');
    return win.btoa(f.read());
}


exports.WrappedFile = WrappedFile;