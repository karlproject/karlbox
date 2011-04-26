function switchPanel(tgt_panel) {
    $('.ka-panel').each(function (i, elem) {
        if ($(this).attr("id") == tgt_panel) {
            $(this).css("display", "block");
        } else {
            $(this).css("display", "none");
        }
    });
}

function switchApp(app_id) {
    // Change styling on app menu, hide existing panel, show new
    var tgt = $('#ka-appswitcher a[href$="' + app_id + '"');
    $('.ka-currentapp').removeClass('ka-currentapp');
    tgt.addClass('ka-currentapp');
    $('#ka-header-appname').text(app_id);
    var tgt_panel = "ka-panel-" + app_id;
    switchPanel(tgt_panel);
    $('#ka-narrowsearch').text(app_id);

}

function switchLanguage(langcode) {
    $('.ka-i18n').each(function (i,elem) {
        var tgt = $(this);
        var newtext = tgt.data("options")[langcode];
        tgt.text(newtext);
    });
}

$(document).ready(function() {

    $(".ka-form-button").button().css("margin", "0.2em");

    // Hook up the app switcher at the top
    $('#ka-appswitcher').click(function (evt) {
        var tgt = $(evt.target);
        var app_id = tgt.attr("href").slice(1);
        switchApp(app_id);
    })
    $('#ka-header-logo').click(function () {
        switchPanel('ka-panel-homepage');

    });

    $('.ka-switchlang').button().click(function () {
        var langcode = $(this).data("options").lang;
        switchLanguage(langcode);
    })
});
