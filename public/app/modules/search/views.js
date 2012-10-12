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

        Views.Tasks = Backbone.View.extend({
            template: "search/tasks"
        });

        Views.Projects = Backbone.View.extend({
            template: "search/projects"
        });

        return Views;

    });
