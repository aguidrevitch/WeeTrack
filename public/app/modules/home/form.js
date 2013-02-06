define([
    "app",

    // Libs
    "backbone",
    "jquery",
    "lodash"
],

    function (app, Backbone, $, _) {

        return app.views.Form.extend({
            template: "home/form",
            className: "row",
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

    });