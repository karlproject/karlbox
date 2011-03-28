var last_update = 'No updates yet';

$('#kb-manual-sync').click(function () {
    postMessage({type: 'trigger_sync'});
});

$('#kb-toggle-sync').click(function () {
    postMessage({type: 'toggle_sync'});
});

$('#kb-open-dashboard').click(function () {
    postMessage({type: 'open_dashboard'});
    return false;
});


onMessage = function onMessage(message) {
    // Handle messages sent from the add-on.  For example, when
    // a background file update happens, the panel might get
    // sent information to display.
    // Message look like this:
    //   message.type - The kind of message
    //   message.value - The data for that type of message
    switch (message.type) {
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
}