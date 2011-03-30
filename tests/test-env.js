
const {Cc,Ci,Cr} = require("chrome");
const env = require("env");

exports.test_test_run = function(test) {
  test.pass('Unit test running!');
};

exports.test_chrome_aliases = function(test) {
    // Make sure the chrome aliases work


    var dirService = Cc["@mozilla.org/file/directory_service;1"].
            getService(Ci.nsIProperties);
    var homeDirFile = dirService.get("Home", Ci.nsIFile);
    var base_dir = homeDirFile.path + '/karlbox';

    // Now test all of them
    test.assertEqual(Cc, env.cc);
    test.assertEqual(Ci, env.ci);
    test.assertEqual(Cr, env.cr);
    test.assertEqual(base_dir, env.base_dir);
};


