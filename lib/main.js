const widgets = require("widget");
const tabs = require("tabs");

var widget = widgets.Widget({
  label: "KARL",
  contentURL: "http://www.mozilla.org/favicon.ico",
  onClick: function() {
    tabs.open("http://karl.soros.org/");
  }
});

console.log("The add-on is running.");
