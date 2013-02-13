define([
    "app",

    // Libs
    "backbone",
    "jquery",
    "lodash"
],

    function (app, Backbone, $, _) {

        var Views = {};

        Views.Form = app.views.Form.extend({
            constructor: function () {
                this.app = app;
                app.views.Form.prototype.constructor.apply(this, arguments);
            },
            afterRender: function () {
                this.uploads = [];

                $('#fileupload', this.$el).off('change');
                $('#fileupload', this.$el).on('change', _.bind(function (e) {
                    var files = e.target.files, file;

                    if (!files || files.length == 0) return;
                    file = files[0];

                    var fileReader = new FileReader();
                    fileReader.onload = _.bind(function (e) {
                        // http://aymkdn.github.com/FileToDataURI/
                        // ATTENTION: to have the same result than the Flash object we need to split
                        // our result to keep only the Base64 part
                        var view = new Views.UploadedFile({
                            model: _.extend({}, file, { data: e.target.result })
                        });
                        this.uploads.push(view);
                        this.insertView("#upload-progress", view).render();
                    }, this);
                    fileReader.readAsDataURL(file);
                }, this));
                app.views.Form.prototype.afterRender.call(this);
            },
            closeForm: function () {
                this.close(function (yes) {
                    if (yes)
                        app.trigger('task:deselected');
                });
            }
        });

        Views.Add = Views.Form.extend({
            template: "home/form",
            events: _.extend({
                'click .submit-form': 'saveTask',
                'click .close-form': 'closeForm'
            }, Views.Form.prototype.events),
            initialize: function () {
                this.listenTo(app.global.projects, 'sync', this.render);
                this.listenTo($(window), 'unload', this.closeForm);
            },
            serialize: function () {
                return {
                    task: this.model,
                    projects: app.global.projects
                };
            },
            afterRender: function () {

                $("[name=owner]", this.$el).select2(
                    this.userListSelect2Options({
                        multiple: false,
                        allowClear: true
                    })
                );

                if (this.model.get('owner'))
                    $("[name=owner]").select2("data", this.userListToSelect2Data([this.model.get('owner')])[0]);

                $("[name=owner]", this.$el).on('change', function (e) {
                    $(this).data('prev', '');
                });

                $("[name=project]", this.$el).select2();

                $("[name=project]", this.$el).on('change', _.bind(function () {
                    this.isDirty = true;
                }, this));
                console.log('Views.Add afterrender');
                this.constructor.__super__.afterRender.call(this);
            },
            saveTask: function () {
                var view = this;
                var workspace = this.model.getWorkspace();

                var task = new app.models.Task();
                task.setWorkspace(workspace);

                var attributes = _.extend({type: 'reply'}, this.$el.find('form').serializeObject());
                task.validateOnServer(attributes, {
                    success: function (model) {
                        var task = new app.models.Task();
                        task.setWorkspace(workspace);

                        attributes.files = [];
                        _.each(view.uploads, function (view) {
                            attributes.files.push(view.model);
                        });

                        task.save(attributes, {
                            success: function (model) {
                                //if (isNew)
                                //    view.collection.push(model);
                                view.isDirty = false;
                                app.trigger('task:selected', model.id);
                            },
                            error: _.bind(app.views.defaultErrorHandler, this, app)
                        })
                    },
                    error: _.bind(app.views.defaultErrorHandler, this, app)
                });
                return false;
            }
        });

        Views.Transaction = Backbone.Layout.extend({
            template: "home/transaction",
            serialize: function () {
                return {
                    workspace: app.global.workspace,
                    task: this.options.task,
                    transaction: this.model
                }
            }
        });

        Views.View = Views.Form.extend({
            template: 'home/view',
            id: "task-details",
            initialize: function () {
                this.listenTo(this.model, 'sync', this.render);
                this.listenTo(this.model, 'change', this.render);
                this.listenTo(app.global.projects, 'sync', this.render);
            },
            serialize: function () {
                return {
                    task: this.model,
                    projects: app.global.projects
                };
            },
            beforeRender: function () {
                console.log(this.model.transactions);
                this.model.transactions.each(function (transaction) {
                    this.insertView('#transactions', new Views.Transaction({
                        task: this.model,
                        model: transaction
                    }));
                }, this);
                this.insertView('.form-container', new Views.TransactionForm({
                    model: this.model
                }));
            }
        });

        Views.TransactionForm = Views.Form.extend({
            template: "home/transaction-form",
            className: "row",
            uploads: {},
            events: _.extend({
                'click .submit-form': 'saveComment',
                'click .close-form': 'closeForm'
            }, Views.Form.prototype.events),
            initialize: function () {
                this.listenTo($(window), 'unload', this.closeForm);
            },
            serialize: function () {
                return {
                    task: this.model
                };
            },
            saveComment: function () {
                var view = this;

                var comment = new app.models.Comment();
                comment.setWorkspace(app.global.workspace.id);
                comment.setTask(this.model.id);

                var attributes = this.$el.find('form').serializeObject();
                if (this.uploads.length)
                    attributes.files = [ true ];

                comment.validateOnServer(attributes, {
                    success: function () {
                        var comment = new app.models.Comment();
                        comment.setWorkspace(app.global.workspace.id);
                        comment.setTask(view.model.id);
                        attributes.files = [];
                        _.each(view.uploads, function (view) {
                            attributes.files.push(view.model);
                        });
                        comment.save(attributes, {
                            success: function (model) {
                                view.model.transactions.add(model.transactions.models);
                                view.model.trigger('change');
                                view.justSaved = true;
                            },
                            error: _.bind(app.views.defaultErrorHandler, this, app)
                        })
                    },
                    error: _.bind(app.views.defaultErrorHandler, this, app)
                });

                return false;
            },
            closeForm: function () {
                this.remove();
            }
        });

        Views.UploadedFile = Backbone.Layout.extend({
            template: "home/uploaded-file",
            serialize: function () {
                return {
                    file: this.model
                };
            },
            afterRender: function () {
                var self = this;
                if (this.model.type.match(/^image\//)) {
                    var img = new Image();
                    img.onload = function () {
                        self.$el.tooltip({
                            html: true,
                            title: '<img src="' + self.model.data + '" width="' + img.width + '" height="' + img.height + '">',
                            trigger: 'hover',
                            placement: 'left'
                        });
                    };
                    img.src = self.model.data;
                }
                this.$el.find('.upload-close').on('click', function () {
                    self.$el.tooltip('destroy');
                    self.remove();
                });
            }
        });

        return Views;

    });