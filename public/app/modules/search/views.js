define([
    "app",

    // Libs
    "backbone",
    "jquery",

    "modules/auth"
],

    function (app, Backbone, $, Auth) {

        var Views = {};

        Views.TaskForm = Backbone.View.extend({
            template: "search/task-form",
            events: {
                'submit #form-task-add': 'addTask'
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
                this.collection.on("reset", this.render, this);
                this.collection.on("add", this.render, this);
            },
            beforeRender: function () {
                console.log('start');
                if (this.collection.length)
                    this.collection.each(function (model) {
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
            afterRender: function () {
                $('#button-new-task').on('click', $.proxy(this.renderForm, this));

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
            data: function () {
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
                this.collection.on("reset", this.render, this);
                this.collection.on("add", this.render, this);
            },
            beforeRender: function () {
                this.collection.each(function (model) {
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
            data: function () {
                return {
                    project: this.model
                };
            }
        });

        Views.Layout = Backbone.View.extend({
            template: "search/layout",
            views: {
                "#left-sidebar": new Views.Projects({
                    collection: Auth.getProjects()
                }),
                "#right-sidebar": new Views.Tasks({
                    collection: Auth.getTasks()
                })
            }
        });

        return Views;

    });
