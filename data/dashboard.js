$('#kb-showsetup').click(function () {
    postMessage({type: 'fetch_setupdata'});
});

$('#kb-savesetup').click(function (evt) {

    var username = $('#kb-username').val();
    var password = $('#kb-password').val();
    var karlurl = $('#kb-karlurl').val();
    var setup = {username: username,
        password: password, karlurl: karlurl};
    var message = {type: "store_setupdata", value: setup};
    postMessage(message);
    return false;
});


onMessage = function onMessage(message) {
    // Handle messages sent from the add-on.
    // Message look like this:
    //   message.type - The kind of message
    //   message.value - The data for that type of message
    var mv = message.value;

    switch (message.type) {
        case 'fill_setupdata': {
            $('#kb-username').val(mv.username);
            $('#kb-password').val(mv.password);
            $('#kb-karlurl').val(mv.karlurl);
            $('#kb-setupform').show('slow');
            return;
        }
        case 'finish_storesetup': {
            $('#kb-setupform').hide('slow');
            return;
        }
    }
};