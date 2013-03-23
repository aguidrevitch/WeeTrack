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
            showConfirm: app.showConfirm,
            showModal: app.showModal,
            afterRender: function () {
                this.uploads = [];
                $('#fileupload', this.$el).off('change');
                $('#fileupload', this.$el).on('change', _.bind(function (e) {
                    var files = e.target.files, file;

                    if (!files || files.length === 0) return;
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

                        this.isDirty = true;
                        this.insertView("#upload-progress", view).render();
                    }, this);
                    fileReader.readAsDataURL(file);
                }, this));

                $('[name=content]').on('keyup', function () {
                    this.isDirty = true;
                });

                app.views.Form.prototype.afterRender.call(this);
            }
        });

        Views.Add = Views.Form.extend({
            template: "home/form-add",
            id: 'form-task-add-wrapper',
            events: _.extend({
                'click .submit-form': 'saveTask'
            }, Views.Form.prototype.events),
            initialize: function () {
                this.user = app.global.user;
                this.listenTo(app.global.projects, 'sync', this.render);
                this.listenTo($(window), 'unload', this.closeInternal);
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

                Views.Form.prototype.afterRender.call(this);
            },
            saveTask: function () {
                var view = this;
                var workspace = this.model.getWorkspace();

                var task = new app.models.Task();
                task.setWorkspace(workspace);

                var attributes = _.extend({type: 'reply'}, this.$el.find('form').serializeObject());
                task.validateOnServer(attributes, {
                    success: _.bind(function (model) {
                        var task = new app.models.Task();
                        task.setWorkspace(workspace);

                        attributes.files = [];
                        _.each(view.uploads, function (view) {
                            attributes.files.push(view.model);
                        });

                        task.save(attributes, {
                            success: _.bind(function (model) {
                                this.isDirty = false;
                                app.global.tasks.push(model);
                                app.trigger('task:selected', model.id);
                            }, this),
                            error: _.bind(app.views.defaultErrorHandler, this)
                        });
                    }, this),
                    error: _.bind(app.views.defaultErrorHandler, this)
                });
                return false;
            },
            closeInternal: function () {
                this.close(function (yes) {
                    if (yes)
                        app.trigger('task:deselected');
                });
            }
        });

        Views.Edit = Views.Add.extend({
            template: 'home/form-edit',
            events: _.extend({
                'click .cancel': 'closeInternal'
            }, Views.Add.prototype.events),
            initialize: function () {
                this.user = app.global.user;
                this.listenTo(this.model, 'sync', this.render);
                //this.listenTo(this.model, 'change', this.render);
                this.listenTo($(window), 'beforeunload', this.closeInternal);
            },
            saveTask: function () {
                var view = this;
                var workspace = this.model.getWorkspace();
                var attributes = this.$el.find('form').serializeObject();
                this.model.save(attributes, {
                    success: function (model) {
                        view.isDirty = false;
                        app.trigger('task:selected', model.id, true);
                    },
                    error: _.bind(app.views.defaultErrorHandler, this)
                });
                return false;
            },
            closeInternal: function () {
                app.trigger('task:selected', this.model.id, true);
            }
        });

        Views.View = Backbone.Layout.extend({
            template: 'home/view',
            id: "task-details",
            events: {
                'click .edit': 'edit',
                'click .show-form': 'toggleForm',
                'click .close': 'close'
            },
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
                this.model.transactions.each(function (transaction) {
                    this.insertView('#transactions', new Views.Transaction({
                        task: this.model,
                        model: transaction
                    }));
                }, this);
            },
            toggleForm: function () {
                var form = this.getView('.transaction-form-container');
                if (form) {
                    form.closeInternal();
                } else {
                    this.insertView('.transaction-form-container', new Views.TransactionForm({
                        model: this.model
                    })).render();
                }
            },
            afterRender: function () {
                //console.log($('#transactions', this.$el).prop("scrollHeight"));
                $('#transactions', this.$el).scrollTop($('#transactions :last', this.$el).prop("scrollHeight"));
            },
            edit: function () {
                app.trigger('task:edit', this.model.id);
            },
            close: function (callback) {
                var form = this.getView('.transaction-form-container');
                if (form)
                    form.close(function (yes) {
                        callback(yes);
                    });
                else
                    callback(true);
            }
        });

        Views.TransactionForm = Views.Form.extend({
            template: "home/transaction-form",
            events: _.extend({
                'click .submit-form': 'saveComment'
            }, Views.Form.prototype.events),
            initialize: function () {
                this.user = app.global.user;
                this.listenTo($(window), 'unload', this.closeInternal);
            },
            serialize: function () {
                return {
                    task: this.model
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
                    $("[name=owner]").select2("data", this.userListToSelect2Data([this.model.get('owner')], true)[0]);

                $("[name=owner]", this.$el).on('change', function (e) {
                    $(this).data('prev', '');
                });

                Views.Form.prototype.afterRender.call(this);
                $('textarea').focus();
            },
            saveComment: function () {
                var view = this;

                var comment = new app.models.Comment();
                comment.setWorkspace(app.global.workspace.id);
                comment.setTask(this.model.id);

                var attributes = this.$el.find('form').serializeObject();

                if (this.uploads.length)
                    attributes.files = [true];

                comment.validateOnServer(attributes, {
                    success: _.bind(function () {
                        var comment = new app.models.Comment();
                        comment.setWorkspace(app.global.workspace.id);
                        comment.setTask(view.model.id);
                        attributes.files = [];
                        _.each(view.uploads, function (view) {
                            attributes.files.push(view.model);
                        });
                        comment.save(attributes, {
                            success: function (model) {
                                view.model.fetch();
                                view.justSaved = true;
                            },
                            error: _.bind(app.views.defaultErrorHandler, this)
                        });
                    }, this),
                    error: _.bind(app.views.defaultErrorHandler, this)
                });

                return false;
            },
            closeInternal: function () {
                this.close(_.bind(function (yes) {
                    if (yes)
                        this.remove();
                }, this));
            }
        });

        Views.Transaction = Backbone.Layout.extend({
            template: "home/transaction",
            serialize: function () {
                return {
                    workspace: app.global.workspace,
                    task: this.options.task,
                    transaction: this.model
                };
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
                            container: 'body',
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