/*

 UI System for Karl Apps.

 */

(function($) {

    function log() {
        if (window.console && console.log) {
            console.log(Array.prototype.slice.call(arguments));
        }
    }

    $.widget("ka.globalbackground", {

                options: {},

                _create: function () {
                    var o = this.options;
                    var el = this.element;

                    $('#ka-header')
                            .header({});

                    // Register templates
                    $('.ka-template').each(function () {
                        var s = $(this);
                        var id = s.attr("id");
                        $.template(id, s);
                    });
                }

            });

    $.widget("ka.header", {

                options: {},

                _create: function () {
                    var o = this.options;
                    var el = this.element;
                    var self = this;



                }

            });

})(jQuery);