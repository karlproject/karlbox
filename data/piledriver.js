var dataView;
var grid;

var columns = [
    {id:"sel", name:"#", field:"num", cssClass:"cell-selection", width:40, resizable:false, selectable:false, focusable:false },
    {id:"title", name:"Title", field:"title", width:120, minWidth:120, cssClass:"cell-title", sortable:true, editor:TextCellEditor},
    {id:"duration", name:"Duration", field:"duration", sortable:true},
    {id:"%", name:"% Complete", field:"percentComplete", width:80, formatter:GraphicalPercentCompleteCellFormatter, sortable:true, groupTotalsFormatter:avgTotalsFormatter},
    {id:"start", name:"Start", field:"start", minWidth:60, sortable:true},
    {id:"finish", name:"Finish", field:"finish", minWidth:60, sortable:true}
];

var options = {
    enableCellNavigation: true,
    editable: true
};

var sortcol = "title";
var sortdir = 1;
var percentCompleteThreshold = 0;
var searchString = "";

function avgTotalsFormatter(totals, columnDef) {
    return "avg: " + Math.round(totals.avg[columnDef.field]) + "%";
}

function myFilter(item) {
    if (item["percentComplete"] < percentCompleteThreshold)
        return false;

    if (searchString != "" && item["title"].indexOf(searchString) == -1)
        return false;

    return true;
}

function percentCompleteSort(a, b) {
    return a["percentComplete"] - b["percentComplete"];
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
        d["duration"] = Math.round(Math.random() * 14);
        d["percentComplete"] = Math.round(Math.random() * 100);
        d["start"] = "01/01/2009";
        d["finish"] = "01/05/2009";
        d["effortDriven"] = (i % 5 == 0);
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
                    reloadGrid(data);
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

        if ($.browser.msie && $.browser.version <= 8) {
            // using temporary Object.prototype.toString override
            // more limited and does lexicographic sort only by default, but can be much faster

            var percentCompleteValueFn = function() {
                var val = this["percentComplete"];
                if (val < 10)
                    return "00" + val;
                else if (val < 100)
                    return "0" + val;
                else
                    return val;
            };

            // use numeric sort of % and lexicographic for everything else
            dataView.fastSort((sortcol == "percentComplete") ? percentCompleteValueFn : sortcol, args.sortAsc);
        }
        else {
            // using native sort with comparer
            // preferred method but can be very slow in IE with huge datasets
            dataView.sort(comparer, args.sortAsc);
        }
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


    var h_runfilters = null;

    // wire up the search textbox to apply the filter to the model
    $("#txtSearch,#txtSearch2").keyup(function(e) {
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
            "duration",
            function (g) {
                return "Duration:  " + g.value + "  <span style='color:green'>(" + g.count + " items)</span>";
            },
            function (a, b) {
                return a.value - b.value;
            }
    );
    dataView.setAggregators([
        new Slick.Data.Aggregators.Avg("percentComplete")
    ], false);

    loadSampleData();
})
