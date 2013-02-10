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
            template: "home/form",
            className: "row",
            uploads: {},
            events: {
                'click .submit-form': 'saveTask',
                'click .close-form': 'closeForm'

            },
            constructor: function () {
                this.app = app;
                this.events = _.extend({}, this.constructor.__super__.events, this.events);
                this.constructor.__super__.constructor.apply(this, arguments);
            },
            initialize: function () {
                this.listenTo(this.model, 'sync', this.render);
                this.listenTo(this.model, 'change', this.render);
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

                var self = this;

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

                $('#fileupload').fileupload({ dataType: 'json',
                    add: function (e, data) {
                        _.each(data.files, function (file) {
                            var view = self.uploads[file.name] = new Views.UploadedFile({
                                model: file,
                                jqXHR: data.submit()
                            });
                            self.insertView("#upload-progress", view).render();
                        }, this);
                    }
                });

                $('#fileupload').bind('fileuploadprogress', function (e, data) {
                    _.each(data.files, function (file) {
                        self.uploads[file.name].onUploadProgress(data);
                    });
                });

                $('#fileupload').bind('fileuploaddone', function (e, data) {
                    _.each(data.files, function (file) {
                        self.uploads[file.name].onUploadDone(data);
                    });
                });

                this.constructor.__super__.afterRender.call(this);
                //this.__super__.method.call(this);
            },
            saveTask: function () {
                var view = this;
                var isNew = this.model.isNew();
                var task = new app.models.Task({ id: this.model.id });
                task.setWorkspace(this.model.getWorkspace());
                task.save(this.$el.find('form').serializeObject(), {
                    success: function (model) {
                        view.model.set(model.attributes);
                        view.model.trigger('change');
                        view.justSaved = true;
                        //if (isNew)
                        //    view.collection.push(model);
                        app.router.navigate('/' + model.id);
                        app.trigger('task:updated', view.model);
                    },
                    error: function (model, res) {
                        var err;
                        try {
                            err = ($.parseJSON(res.responseText)).error;
                        } catch (e) {
                            return;
                        }

                        if (err._modal)
                            app.showModal(err._modal.message);

                        $(':input + .error', self.el).html('');
                        $(':input', self.el).parents('.control-group').removeClass('error');
                        _.each(err, function (value, field) {
                            var selector = '[name="' + field + '"]:input';
                            $(selector, self.el).parents('.control-group').addClass('error');
                            $(selector, self.el).siblings('.error').html(t(value.message));
                        });
                    }
                });
                return false;
            },
            close: function (callback) {
                if (this.isDirty) {
                    app.showConfirm(t('Unsaved changes'), function (yes) {
                        callback(yes);
                    });
                } else {
                    callback(true);
                }
            },
            closeForm: function () {
                this.close(function (yes) {
                    if (yes)
                        app.trigger('task:deselected');
                });
            }
        });

        Views.UploadedFile = Backbone.Layout.extend({
            template: "home/uploaded-file",
            keep: true,
            initialize: function () {
                var self = this;
                this.options.jqXHR.error(function (jqXHR, textStatus, errorThrown) {
                    var progress = self.$el.find('.upload-progress span');
                    if (errorThrown == 'abort')
                        progress.text(t(errorThrown));
                    else
                        progress.text(t('error'));
                    progress.removeClass('label-info').addClass('label-important');
                    self.$el.find('.upload-close').off('click');
                    self.$el.find('.upload-close').on('click', function () {
                        self.remove();
                    });
                });
            },
            afterRender: function () {
                var self = this;
                this.$el.find('.upload-close').on('click', function () {
                    self.options.jqXHR.abort();
                });
            },
            onUploadProgress: function (data) {
                this.$el.find('.upload-progress span').html(parseInt(data.loaded / data.total * 100, 10) + "%");
            },
            onUploadDone: function (data) {
                this.$el.find('.upload-progress span').text("done").removeClass('label-info').addClass('label-success');
                var self = this;
                this.$el.find('.upload-close').off('click');
                _.each(data.files, function (file, index) {
                    if (file.name == self.model.name) {
                        //console.log(data.result[index]);
                        self.$el.append('<input type="hidden" name="upload" value="' + data.result[index].name + '">');
                        if (data.result[index].thumbnail_url) {
                            var thumbnail = new Image();
                            thumbnail.onload = function () {
                                self.$el.tooltip({
                                    html: true,
                                    title: '<img src="' + thumbnail.src + '">',
                                    trigger: 'hover',
                                    placement: 'left'
                                });
                            };
                            thumbnail.src = data.result[index].thumbnail_url;
                        }
                        self.$el.find('.upload-close').on('click', function () {
                            self.$el.tooltip('destroy');
                            $.ajax({
                                type: 'DELETE',
                                url: data.result[index].delete_url,
                                success: function () {
                                    self.remove();
                                }
                            });
                        });
                    }
                });
            },
            serialize: function () {
                return {
                    file: this.model
                };
            }
        });

        return Views;

    });