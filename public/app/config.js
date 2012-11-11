// Set the require.js configuration for your application.
require.config({

    // Initialize the application with the main application file.
    deps: ["main"],

    paths: {
        // JavaScript folders.
        libs: "../assets/js/libs",
        plugins: "../assets/js/plugins",
        vendor: "../assets/vendor",

        // Libraries.
        jquery: "../assets/js/libs/jquery",
        lodash: "../assets/js/libs/lodash",
        backbone: "../assets/js/libs/backbone",
        bootstrap: "../assets/js/libs/bootstrap",
        i18next: "../assets/js/libs/i18next",
        moment: "../assets/js/libs/moment",
        stacktrace: "../assets/js/libs/stacktrace",
        "jquery.ui.widget": "../assets/js/libs/jquery.ui.widget",
    },

    shim: {
        // Backbone library depends on lodash and jQuery.
        backbone: {
            deps: ["lodash", "jquery"],
            exports: "Backbone"
        },
        bootstrap: [ "jquery" ],

        "jquery.ui.widget": ["jquery"],

        "plugins/jquery.iframe-transport": ["jquery"],
        "plugins/jquery.fileupload": ["jquery"],

        // Backbone.LayoutManager depends on Backbone.
        "plugins/backbone.layoutmanager": ["backbone"],
        "plugins/backbone.syphon": ["backbone"],


        // russian locale for moment.js
        "../locales/ru/ru": [ "moment" ]
    }

});
