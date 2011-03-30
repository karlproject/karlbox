// Suppress console.log spewage in addon code
const env = require("env");
env.log = function () {};


const remoteChanges = require("remote-changes");


exports.test_test_run = function(test) {
  test.pass('Unit test running!');
};


