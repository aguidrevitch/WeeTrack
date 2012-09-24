define([
    "app",

    // Libs
    "backbone",
    "jquery"
    ],

    function(app, Backbone, $) {

        var Views = {};

        Views.Layout = Backbone.View.extend({
            template: "search/layout"
        });

        Views.SearchResult = Backbone.View.extend({
            template: "search/result"
        });

        Views.Projects = Backbone.View.extend({
            template: "search/projects"
        });

        return Views;

    });
