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

                this.uploads = [];
                $('#fileupload', this.$el).off('change');
                $('#fileupload', this.$el).on('change', function (e) {
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
                        self.uploads.push(view);
                        self.insertView("#upload-progress", view).render();
                    }, this);
                    fileReader.readAsDataURL(file);
                });

                this.constructor.__super__.afterRender.call(this);
            },
            saveTask: function () {
                var view = this;
                var id = this.model.id
                var isNew = this.model.isNew();
                var workspace = this.model.getWorkspace();

                var attributes = this.$el.find('form').serializeObject();

                var task = new app.models.Task({ id: id });
                task.setWorkspace(workspace);
                task.validateOnServer(attributes, {
                    success: function (model) {
                        console.log(model);
                        var task = new app.models.Task({ id: id });
                        task.setWorkspace(workspace);
                        attributes.files = [];
                        _.each(view.uploads, function (view) {
                            attributes.files.push(view.model);
                        });
                        task.save(attributes, {
                            success: function (model) {
                                view.model.set(model.attributes);
                                view.model.trigger('change');
                                view.justSaved = true;
                                //if (isNew)
                                //    view.collection.push(model);
                                app.router.navigate('/' + model.id);
                                app.trigger('task:updated', view.model);
                            }
                        })
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