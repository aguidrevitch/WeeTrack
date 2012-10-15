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

        Views.TaskForm = Backbone.View.extend({
            template: "search/task-form",
            events: {
                'submit #form-task-add': 'addTask'
            },
            beforeRender: function () {
            },
            addTask: function () {
                var self = this;
                var task = new this.collection.model();
                task.save(Backbone.Syphon.serialize(this), {
                    success: function (model) {
                        self.collection.push(model);
                    },
                    error: function (model, res) {
                        var error = ($.parseJSON(res.responseText)).error;
                        console.log(error);
                    }
                });
                return false;
            }
        });

        Views.Tasks = Backbone.View.extend({
            template: "search/tasks",
            initialize: function () {
                //this.collection.on("reset", this.render, this);
                //this.collection.on("add", this.render, this);
                $(document).on('click', '#button-new-task', $.proxy(this.renderForm, this));
                this.render();
            },
            cleanup: function () {
                this.collection.off(null, null, this);
            },
            beforeRender: function() {
                console.log('start');
                if (this.collection.length)
                    this.collection.each(function(model) {
                        this.insertView("ul", new Views.Task({
                            model: model
                        }));
                    }, this);
                else
                    this.insertView('.span5', new Backbone.View({
                        render: function () {
                            console.log(arguments);
                            return 'No tasks';
                        }
                    }));
                console.log('end');
            },
            renderForm: function () {
                this.setView('.ticket-details', new Views.TaskForm({
                    collection: this.collection
                })).render();
            }
        });

        Views.Task = Backbone.View.extend({
            template: "search/task",
            tagName: 'li',
            serialize: function () {
                return {
                    task: this.model
                };
            }
        });

        Views.Projects = Backbone.View.extend({
            template: 'search/projects',
            events: {
                'click #form-project-add .btn': 'addProject'
            },
            initialize: function () {
                this.collection.on("refresh", this.render, this);
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
                project.save(Backbone.Syphon.serialize(this), {
                    success: function (project) {
                        self.collection.push(project);
                    },
                    error: function (object, res) {
                        var error = ($.parseJSON(res.responseText)).error;
                        console.log(error.name.message);
                        $('#form-project-add [name=name]:input').tooltip({
                            trigger: 'manual',
                            title: t(error.name.message)
                        }).tooltip('show');
                        $('#form-project-add [name=name]:input').parents('.control-group').addClass('error');
                        setTimeout(function () {
                            $('#form-project-add [name=name]:input').parents('.control-group').removeClass('error');
                            $('#form-project-add [name=name]:input').tooltip('destroy');
                        }, 2000);
                    }
                });
                return false;
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
