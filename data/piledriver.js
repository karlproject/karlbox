var dataView;
var grid;
var timeslots;


var columns = [
    {id:"sel", name:"#", field:"num", cssClass:"cell-selection", width:40, resizable:false, selectable:false, focusable:false },
    {id:"title", name:"Title", field:"title", width:400, minWidth:200, cssClass:"cell-title", sortable:true, editor:TextCellEditor},
    {id:"who", name:"Who", field:"who", sortable:true, width: 150, minWidth: 100}
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
    dataView.beginUpdate();
    dataView.setItems(data);
    dataView.endUpdate();
}

function loadRandomData() {
    // prepare the data
    var data = [];
    var sample_size = 10000;
    for (var i = 0; i < sample_size; i++) {
        var d = (data[i] = {});

        d["id"] = "id_" + i;
        d["num"] = i;
        d["title"] = "Task " + i;
        d["timeslot"] = Math.round(Math.random() * 4);
        d["who"] = "Sammy";
    }
    reloadGrid(data);
}

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
    loadSampleData();
});
