const file = require("file");

const env = require("env");

var Request = require("request").Request;

function MultiPoster(base_dir) {
    this.items = [];
    this.base_dir = base_dir;

    this.add_file = function(file_name) {
        this.items.push(file_name);
    };

    var self = this;
    var _post_all = function(start_item) {
        if (start_item < self.items.length) {
            // Post the next file.
            post_file(self.base_dir, self.items[start_item], function() {
                // Continuation
                _post_all(start_item + 1);
            });
        } else {
            // Finished.
            if (self.callback) {
                self.callback();
            }
        }
    };

    this.post_all = function(callback) {
        this.callback = callback;
        _post_all(0);
    };

}

function post_file(base_dir, file_name, complete) {

    // XXX Hacks to get to a DOMWindow so we can use btoa
    var wm = env.nsIWindowMediator;
    var win =  wm.getMostRecentWindow('navigator:browser');

    var path = file.join(base_dir, file_name)
    var f = file.open(path, 'rb');
    var txt = win.btoa(f.read());

    env.log('Read', path, ', length=', txt.length);


    var content = {
        binfile: txt,
        filename: file_name
    };

    var url = 'http://localhost:6543/communities/default/files/new_upload_file.json';
    var karl = Request({
                url: url,
                content: content,
                headers: {Authorization: 'Basic YWRtaW46YWRtaW4='},
                onComplete: function (response) {
                    //env.log('finished. --');
                    env.log('finished: ' + response.text);
                    if (complete) {
                        complete();
                    }
                }
            });
    karl.post();
}


exports.send = function(base_dir, changes) {
    var poster = new MultiPoster(base_dir);
    changes.added.forEach(function(item) {
        poster.add_file(item.name);
    });
    changes.modified.forEach(function(item) {
        poster.add_file(item.name);
    });
    poster.post_all(null);
}



