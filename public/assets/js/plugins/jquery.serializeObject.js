(function (factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        // Register as an anonymous AMD module:
        define(['jquery'], factory);
    } else {
        // Browser globals:
        factory(window.jQuery);
    }
}(function ($) {
    'use strict';
    $.fn.serializeObject = function() {
        var form = this;
        var o = {};
        var a = form.serializeArray();
        $.each(a, function() {
            var s2 = form.find('[name=' + this.name + ']:input').data('select2');
            if (s2) {
                o[this.name] = s2.val();
            } else {
                if (o[this.name]) {
                    if (!o[this.name].push) {
                        o[this.name] = [o[this.name]];
                    }
                    o[this.name].push(this.value || '');
                } else {
                    o[this.name] = this.value || '';
                }
            }
        });
        return o;
    };
}));