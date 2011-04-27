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
    var sel = '#ka-appswitcher a[href$="#' + app_id + '"]';
    var tgt = $(sel);
    $('.ka-currentapp').removeClass('ka-currentapp');
    tgt.addClass('ka-currentapp');
    $('#ka-header-appname').text(app_id);
    var tgt_panel = "ka-panel-" + app_id;
    switchPanel(tgt_panel);
    $('#ka-narrowsearch').text(app_id);

}

function switchLanguage(langcode) {
    $('.ka-i18n').each(function (i, elem) {
        var tgt = $(this);
        var newtext = tgt.data("options")[langcode];
        tgt.text(newtext);
    });
}

$(document).ready(function() {

    $(".ka-form-button").button().css("margin", "0.2em");

    // Hook up the app switcher at the top
    $('#ka-appswitcher').click(function (evt) {
        var tgt = $(evt.target).parent();
        var app_id = tgt.attr("href").slice(1);
        switchApp(app_id);
    });
    $('#ka-header-logo').click(function () {
        switchPanel('ka-panel-homepage');

    });

    $('.ka-switchlang').button().click(function () {
        var langcode = $(this).data("options").lang;
        switchLanguage(langcode);
    });

    // Switch to whatever is in the hash
    var app_id = window.location.hash.slice(1);
    switchApp(app_id);

    $('#kb-savesetup').click(function (evt) {
        // an event that the JetPack can listen to
        // "poor man's event" :)
        save_preferences && save_preferences();
        return false;
    });

    var last_update = 'No updates yet';

    $('#kb-manual-sync').click(function () {
        _postMessage && _postMessage({type: 'trigger_sync'});
    });

    $('#kb-toggle-sync').click(function () {
        _postMessage && _postMessage({type: 'toggle_sync'});
    });

});

var dataView;
var grid;
var timeslots;
var items;

var columns = [
    {id:"sel", name:"#", field:"num", cssClass:"cell-selection", width:40, resizable:false, selectable:false, focusable:false },
    {id:"title", name:"Title", field:"title", width:400, minWidth:200, cssClass:"cell-title", sortable:true, editor:TextCellEditor},
    {id:"who", name:"Who", field:"who", sortable:true, width: 140, minWidth: 100}
];

var options = {
    enableCellNavigation: true,
    editable: true
};

var sortcol = "title";
var sortdir = 1;
var searchString = "";

function myFilter(item) {
    if (searchString != "" && item["title"].indexOf(searchString) == -1)
        return false;

    return true;
}

function comparer(a, b) {
    var x = a[sortcol], y = b[sortcol];
    return (x == y ? 0 : (x > y ? 1 : -1));
}

function reloadGrid(data) {
    items = data;
    dataView.beginUpdate();
    dataView.setItems(data);
    dataView.endUpdate();
}

function dumpGrid () {
    // Give something on the outside (e.g. addon) access to data
    return data;
}

function loadRandomData() {
    // prepare the data
    var _items = [];
    var sample_size = 10000;
    for (var i = 0; i < sample_size; i++) {
        var d = (_items[i] = {});

        d.id = "id_" + i;
        d.num = i;
        d.title = "Task " + i;
        d.timeslot = Math.round(Math.random() * 4);
        d.who = "Sammy";
    }
    timeslots = {
        "0": "January 1",
        "1": "January 8",
        "2": "February 1",
        "3": "March 15",
        "4": "May 1"
    };
    reloadGrid(_items);
}

function saveSync() {
    var items = dataView.getItems();
    var data = {
        timeslots: timeslots,
        items: items
    }
    var txt = JSON.stringify(data);
    _postMessage && _postMessage({type: 'save_sync', value: txt});
}

function loadSync() {
    _postMessage && _postMessage({type: 'load_sync'});
}

function loadSyncFinish(txt) {
    var data = JSON.parse(txt);
    timeslots = data.timeslots;
    reloadGrid(data.items);
}


/*
function loadSampleData() {
    var url = "piledriver.json";
    $.ajax({
                url: url,
                dataType: 'json',
                error: function (jqxhr, status, errorThrown) {
                    console.log("Error: " + errorThrown);
                },
                cache: false,
                success: function (data) {
                    timeslots = data.timeslots;
                    reloadGrid(data.items);
                }});
}
*/


$(function() {

    var groupItemMetadataProvider = new Slick.Data.GroupItemMetadataProvider();
    dataView = new Slick.Data.DataView({
                groupItemMetadataProvider: groupItemMetadataProvider
            });
    grid = new Slick.Grid("#myGrid", dataView, columns, options);

    // register the group item metadata provider to add expand/collapse group handlers
    grid.registerPlugin(groupItemMetadataProvider);

    grid.setSelectionModel(new Slick.CellSelectionModel());


    grid.onSort.subscribe(function(e, args) {
        sortdir = args.sortAsc ? 1 : -1;
        sortcol = args.sortCol.field;

        dataView.sort(comparer, args.sortAsc);
    });

    // wire up model events to drive the grid
    dataView.onRowCountChanged.subscribe(function(e, args) {
        grid.updateRowCount();
        grid.render();
    });

    dataView.onRowsChanged.subscribe(function(e, args) {
        grid.invalidateRows(args.rows);
        grid.render();
    });


    // wire up the search textbox to apply the filter to the model
    $("#txtSearch").keyup(function(e) {
        Slick.GlobalEditorLock.cancelCurrentEdit();

        // clear on Esc
        if (e.which == 27)
            this.value = "";

        searchString = this.value;
        dataView.refresh();
    });


    // initialize the model after all the events have been hooked up
    $("#gridContainer").resizable();
    dataView.setFilter(myFilter);
    dataView.groupBy(
            "timeslot",
            function (g) {
                var timeslot = "Timeslot:  " + timeslots[g.value];
                var counter = "  <span style='color:green'>(" + g.count + " items)</span>";
                return timeslot + counter;
            },
            function (a, b) {
                return a.value - b.value;
            }
    );
    ////loadSampleData();

    $('#add-new-item').submit(function (evt) {
        evt.stopPropagation();
        evt.preventDefault();
        var rand_id = Math.round(Math.random() * 999);
        var item = {
            id: "id_" + rand_id,
            num: rand_id,
            title: $('#ani-title').val(),
            who:  $('#ani-who').val(),
            timeslot: $('#ani-timeslot').val()
        };
        items.push(item);
        reloadGrid(items);
        return false;
    });
});
