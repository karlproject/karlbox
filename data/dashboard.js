
window.save_preferences = function() {
    var username = $('#kb-username').val();
    var password = $('#kb-password').val();
    var karlurl = $('#kb-karlurl').val();
    var karlcommunity = $('#kb-karlcommunity').val();
    var localdir = $('#kb-localdir').val();
    var setup = {
        username: username,
        password: password,
        karlurl: karlurl,
        karlcommunity: karlcommunity,
        localdir: localdir
    };
    var message = {type: "store_setupdata", value: setup};
    postMessage(message);
    return false;
};

window._postMessage = function(message) {
    postMessage(message);
};


onMessage = function onMessage(message) {
    var mv = message.value;

    switch (message.type) {
        case 'fill_setupdata': {
            $('#kb-username').val(mv.username);
            $('#kb-password').val(mv.password);
            $('#kb-karlurl').val(mv.karlurl);
            $('#kb-karlcommunity').val(mv.karlcommunity);
            $('#kb-localdir').val(mv.localdir);
            
            // Switch to this panel
            switchPanel('ka-panel-karlbox');
            return;
        }
        case 'finish_storesetup': {
            return;
        }
        case 'last_update': {
            console.log('sent a last_update type');
            $('#kb-last-updated').text(message.value);
            return;
        }
        case 'sync_on': {
            $('#kb-toggle-sync').text('Sync is ON')
            console.log('sent a sync_on type')
            return;
        }
        case 'sync_off': {
            $('#kb-toggle-sync').text('Sync is OFF')
            console.log('sent a sync_off type')
            return;
        }
    }

};


