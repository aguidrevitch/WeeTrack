// Set the require.js configuration for your application.
require.config({

    // Initialize the application with the main application file.
    deps: ["main"],

    include: [
        "modules/auth",
        "modules/workspace",
        "modules/project",
        "modules/home"
    ],

    paths: {
        // JavaScript folders.
        libs: "../assets/js/libs",
        plugins: "../assets/js/plugins",
        vendor: "../assets/vendor",

        // Libraries.
        jquery: "../assets/js/libs/jquery",
        lodash: "../assets/js/libs/lodash.underscore",
        backbone: "../assets/js/libs/backbone",
        bootstrap: "../assets/vendor/bootstrap/js/bootstrap",
        i18next: "../assets/vendor/i18next/js/i18next",
        moment: "../assets/vendor/moment/js/moment",
        select2: "../assets/vendor/select2/js/select2"
    },

    shim: {
        lodash: {
            exports: '_'    
        },
        // Backbone library depends on underscore and jQuery.
        backbone: {
            deps: [ "lodash", "jquery" ],
            exports: "Backbone"
        },
        bootstrap: [ "jquery" ],
        select2: [ "jquery" ],

        "plugins/jquery.serializeObject": [ "jquery" ],
        "plugins/jquery.setCursorPosition": [ "jquery" ],

        // Backbone.LayoutManager depends on Backbone.
        "plugins/backbone.layoutmanager": [ "backbone" ],

        // russian locale for moment.js
        "../locales/ru/ru": [ "moment" ]
    }

});
