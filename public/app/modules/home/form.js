define([
    "app",

    // Libs
    "backbone",
    "jquery",
    "lodash"
],

    function (app, Backbone, $, _) {

        return Backbone.Layout.extend({
            template: "home/form",
            className: "row",
            events: {
                'click .submit-form': 'saveTask',
                'click .close-form': 'closeForm'

            },
            initialize: function () {
                this.projects = this.options.projects;
                this.listenTo(this.model, 'sync', this.render);
                this.listenTo(this.model, 'change', this.render);
                this.listenTo(this.projects, 'sync', this.render);
                this.listenTo($(window), 'unload', this.closeForm);
            },
            serialize: function () {
                return {
                    task: this.model,
                    projects: this.projects
                };
            },
            afterRender: function () {
                var self = this;

                var select2options = {
                    placeholder: t("Search for a user"),
                    tokenSeparators: [' ', ',', ';'],
                    minimumInputLength: 1,
                    multiple: true,
                    quietMillis: 2000,
                    formatInputTooShort: function (term) {
                        return '';
                    },
                    formatNoMatches: function (term) {
                        return '';
                    },
                    formatSearching: function (term) {
                        return '';
                    },
                    query: function (query) {
                        var email = /^(([^<>()\[\]\\.,;:\s@\"]+(\.[^<>()\[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                        var self = this;
                        var prev = $(self.element).data('prev') || '';
                        prev = prev.replace(/[(\[\]\.\*\?\^\$\\]/g, function (m) {
                            return '\\' + m;
                        });
                        var prevre = new RegExp('^' + prev, 'i');
                        if (prev && query.term.match(prevre)) {
                            $(this.element).data('prev', query.term);
                            if (query.term.match(email))
                                query.callback({results: [
                                    {id: query.term, text: query.term}
                                ]});
                            else
                                query.callback({results: []});
                        } else {
                            $.ajax({
                                url: "/api/user",
                                dataType: 'json',
                                data: { q: query.term },
                                success: function (data) {
                                    if (data.length) {
                                        _.each(data, function (v) {
                                            v.id = v._id;
                                            v.text = v.name ? v.name : v.email;
                                        });
                                        query.callback({results: data});
                                    } else {
                                        $(self.element).data('prev', query.term);
                                        if (query.term.match(email))
                                            query.callback({results: [
                                                {id: query.term, text: query.term}
                                            ]});
                                        else
                                            query.callback({results: []});
                                    }
                                }
                            });
                        }
                    },
                    initSelection: function () {
                        // do nothing
                    }
                };

                var toData = function (users) {
                    var data = [];
                    _.each(users, function (user) {
                        if (user) {
                            var rec = { id: user._id };
                            rec.text = user.name ? user.name : user.email;
                            data.push(rec);
                        }
                    });
                    return(data);
                };

                $("[name=owner]", this.$el).select2(_.extend({}, select2options, {
                    multiple: false,
                    allowClear: true,
                }));
                $("[name=admin], [name=admincc], [name=cc], [name=watch]", this.$el).select2(select2options);
                if (this.model.get('owner'))
                    $("[name=owner]").select2("data", toData([this.model.get('owner')])[0]);

                _.each(['admin', 'admincc', 'cc', 'watch'], function (perm) {
                    if (this.model.get(perm))
                        $("[name=" + perm + "]").select2("data", toData(this.model.get(perm)));
                }, this);

                $("[name=owner], [name=admin], [name=admincc], [name=cc], [name=watch]", this.$el).on('change', function (e) {
                    $(this).data('prev', '');
                });
                $("[name=project]", this.$el).select2();
                $("[name=admin], [name=admincc], [name=cc], [name=watch]", this.$el).select2('val', []);

                if (this.justSaved) {
                    $('.alert', this.$el).alert();
                    $('.alert', this.$el).show();
                    setTimeout(function () {
                        $('.alert', this.$el).fadeOut('slow');
                    }, 2000);
                }

                $(':input', this.$el).filter(function () {
                    return !$(this).hasClass('select2-input');
                }).on('keyup', _.bind(function () {
                    this.isDirty = true;
                }, this));

                $("[name=owner], [name=admin], [name=admincc], [name=cc], [name=watch]", this.$el).on('change', _.bind(function () {
                    this.isDirty = true;
                }, this));

                this.isDirty = false;
                this.justSaved = false;
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