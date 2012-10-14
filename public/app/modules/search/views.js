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
            template: 'search/projects',
            events: {
                'click #add-project-button': 'addProject'
            },
            // Insert all subViews prior to rendering the View.
            initialize: function () {
                this.collection.on("reset", this.render, this);
                //this.collection.on("change", this.render, this);
                this.collection.on("add", this.render, this);
            },
            cleanup: function () {
                this.collection.off(null, null, this);
            },
            beforeRender: function() {
                this.collection.each(function(model) {
                    this.insertView("ul", new Views.Project({
                        model: model
                    }));
                }, this);
            },
            addProject: function () {
                var self = this;
                var project = new this.collection.model();
                project.save({
                    name: $('#add-project-name').val()
                }, {
                    success: function (project) {
                        self.collection.push(project);
                    },
                    error: function (object, res) {
                        var error = ($.parseJSON(res.responseText)).error;
                        $('#add-project-name').tooltip({
                            trigger: 'manual',
                            title: t(error.name.message)
                        }).tooltip('show');
                        $('#add-project-name').parents('.control-group').addClass('error');
                        setTimeout(function () {
                            $('#add-project-name').parents('.control-group').removeClass('error');
                            $('#add-project-name').tooltip('hide');
                        }, 2000);
                    }
                });
                return false;
            //console.log(this.collection.model);
            }
        });

        Views.Project = Backbone.View.extend({
            template: "search/project",
            tagName: 'li',
            serialize: function () {
                return {
                    project: this.model
                };
            }
        });

        return Views;

    });
