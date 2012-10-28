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
        });

        Views.Tasks = Backbone.View.extend({
            template: "search/tasks",
            id: "tasks",
            events: {
                'click .show-form': 'toggleForm',
                'click .close': 'toggleForm',
                'click .submit-form': 'addTask'
            },
            initialize: function () {
                this.collection.on("reset", this.render, this);
                this.collection.on("add", this.render, this);
            },
            beforeRender: function () {
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
            },
            toggleForm: function () {
                $('form', this.$el).toggle('slow');
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
            id: "projects",
            events: {
                'click .show-form': 'showForm',
                'click .submit-form': 'addProject'
            },
            initialize: function () {
                this.collection.on("reset", this.render, this);
                this.collection.on("add", this.render, this);
            },
            beforeRender: function () {
                console.log('before');
                this.collection.each(function (model) {
                    this.insertView("ul", new Views.Project({
                        model: model
                    }));
                }, this);
            },
            showForm: function () {
                $('form', this.$el).toggle('slow');
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

        var Project = Backbone.Model.extend({
            idAttribute: "_id",
            url: '/api/project'
        });

        var Projects = Backbone.Collection.extend({
            model: Project,
            url: '/api/project'
        });

        var Task = Backbone.Model.extend({
            idAttribute: "_id",
            url: '/api/task'
        });

        var Tasks = Backbone.Collection.extend({
            model: Task,
            url: '/api/task'
        });

        var projects = new Projects();
        var tasks = new Tasks();

        app.on('user:authorized', function () {
            tasks.fetch();
            projects.fetch();
        });

        app.on('user:deauthorized', function () {
            tasks.reset();
            projects.reset();
        });

        Views.Layout = Backbone.View.extend({
            template: "search/layout",
            className: 'row',
            views: {
                "#left-sidebar": new Views.Projects({
                    collection: projects
                }),
                "#middle-sidebar": new Views.Tasks({
                    collection: tasks
                })
            }
        });

        return Views;

    });
