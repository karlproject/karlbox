/*

 UI System for Karl Apps.

 */

(function($) {

    return;
    
    function log() {
        if (window.console && console.log) {
            console.log(Array.prototype.slice.call(arguments));
        }
    }

    $.widget("ka.globalbackground", {

                options: {
                    message: 'Hello, World!'
                },

                _create: function () {
                    var o = this.options;
                    var el = this.element;

                    $('#ka-header')
                            .header({
                                message: 'Howdy World'
                            });

                    // Register templates
                    $('.ka-template').each(function () {
                        var s = $(this);
                        var id = s.attr("id");
                        $.template(id, s);
                    });
                },

                _setOption: function (key, value) {

                    var el = this.element;
                    if (key == 'message') {
                        el.text(value);
                    }
                }

            });

    $.widget("ka.header", {

                options: {
                    message: 'Hello, World!'
                },

                _create: function () {
                    var o = this.options;
                    var el = this.element;
                    var self = this;

                    // Any <a> in the header with a certain class can
                    // have a template redraw the main area
                    $('.ka-subnav').click(function (evt) {
                        var viewname = $(this).attr("href").slice(1);
                        var tgt = $(this).data("options").tgt;
                        var ns = {x: 123, self: self};
                        $(tgt).empty().append($.tmpl(viewname, ns));
                        return false;
                    })

                },

                calc: function () {
                    return 9999
                },

                _setOption: function (key, value) {

                    var el = this.element;
                    if (key == 'message') {
                        el.text(value);
                    }
                }

            });

})(jQuery);