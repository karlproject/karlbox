/*

 Non-mutable state and setup shared between modules.
 */

const {Cc,Ci,Cr} = require("chrome");

// The following is an attempt to defeat PyCharm's syntax
// highlighter, which always splits up the CC,Ci,Cr above.
// By putting the declarations in here, we avoid spreading
// the problem across modules.
exports.cc = Cc;
exports.ci = Ci;
exports.cr = Cr;


exports.dirService = Cc["@mozilla.org/file/directory_service;1"].
        getService(Ci.nsIProperties);
var homeDirFile = exports.dirService.get("Home", Ci.nsIFile);
exports.base_dir = homeDirFile.path + '/karlbox';

// XPCOM local file
exports.lf = Cc['@mozilla.org/file/local;1']
        .createInstance(Ci.nsILocalFile);

// XPCOM window mediator
exports.wm = Cc['@mozilla.org/appshell/window-mediator;1']
        .getService(Ci.nsIWindowMediator);

// When unit tests run, they get a ton of spewage about info logging.
// We'd like to allow console.log within test code, but suppress
// log notices from addon code.  So here is an alias env.log which
// can be replaced with a null something in test code.
exports.log = console.log;
