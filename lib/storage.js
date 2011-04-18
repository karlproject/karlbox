
// Create the storage structure before any modules use it
//
const env = require("env");
const simpleStorage = require('simple-storage');

exports.initSyncData = function() {
    // sync data is created with some random hash
    var hash = '' + new Date().valueOf() + Math.floor(Math.random() * 100000);
    simpleStorage.storage.sync_data = {hash: hash};
}

// Initialize the simple storage if needed
if (!simpleStorage.storage.sync_data) {
    exports.initSyncData();
    env.log('No sync data in the storage: creating a clean one');
}
if (!simpleStorage.storage.preferences) {
    simpleStorage.storage.preferences = {};
    env.log('No preferences in the storage: creating a clean one');
}

exports.storage = simpleStorage.storage;


