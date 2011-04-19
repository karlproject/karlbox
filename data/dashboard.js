$('#kb-showsetup').click(function () {
    $('#kb-setupform').toggle('slow');
    postMessage({type: "fetch_setupdata"});
});

$('#kb-savesetup').click(function (evt) {

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
});

onMessage = function onMessage(message) {
    var mv = message.value;

    switch (message.type) {
        case 'fill_setupdata': {
            $('#kb-username').val(mv.username);
            $('#kb-password').val(mv.password);
            $('#kb-karlurl').val(mv.karlurl);
            $('#kb-karlcommunity').val(mv.karlcommunity);
            $('#kb-localdir').val(mv.localdir);
            return;
        }
        case 'finish_storesetup': {
            $('#kb-setupform').hide('slow');
            return;
        }
    }
};
