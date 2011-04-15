
// Create the storage structure before any modules use it
//
const env = require("env");
const simpleStorage = require('simple-storage');

// Initialize the simple storage if needed
if (!simpleStorage.storage.sync_data) {
  simpleStorage.storage.sync_data = {};
  env.log('No sync data in the storage: creating a clean one');
}
if (!simpleStorage.storage.preferences) {
  simpleStorage.storage.preferences = {};
  env.log('No preferences in the storage: creating a clean one');
}

exports.storage = simpleStorage.storage;

