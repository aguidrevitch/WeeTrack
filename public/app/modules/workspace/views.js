define([
    "app",

    // Libs
    "backbone",
    "jquery",
    "lodash",

    "modules/auth"
],

    function (app, Backbone, $, _, Auth) {

        var Views = {};

        Views.Layout = Backbone.Layout.extend({
            template: "workspace/layout",
            className: 'row',
            initialize: function () {

                this.setViews({
                    "#middle-sidebar": new Views.Info(),
                    "#left-sidebar": new Views.List({
                        collection: this.collection
                    })
                });

                this.listenTo(app, "workspace:selected", function (id) {

                    var openedForm = this.getView('#middle-sidebar');

                    if (openedForm.model && id == openedForm.model.id)
                        return;

                    openedForm.close(_.bind(function (yes) {
                        if (yes) {
                            if (id && id != 'add') {
                                app.router.navigate('workspace/' + id);
                                // existing workspace
                                var workspace = new app.models.Workspace({ _id: id});
                                workspace.setPermission('visible');
                                workspace.fetch({
                                    success: _.bind(function (model) {
                                        if (model.isAdministrator(app.global.user)) {
                                            this.setViews({
                                                "#middle-sidebar": new Views.Form({
                                                    collection: this.collection,
                                                    model: model
                                                })
                                            });
                                        } else {
                                            this.setViews({
                                                "#middle-sidebar": new Views.Watch({
                                                    collection: this.collection,
                                                    model: model
                                                })
                                            });
                                        }
                                    }, this)
                                });
                            } else {
                                app.router.navigate('workspace/add');
                                // new workspace
                                this.setViews({
                                    "#middle-sidebar": new Views.Form({
                                        collection: this.collection,
                                        model: new app.models.Workspace()
                                    })
                                });
                                this.getView('#middle-sidebar').render();
                            }
                        }
                    }, this));
                }, this);

                this.listenTo(app, "workspace:deselected", function () {
                    this.setViews({
                        "#middle-sidebar": new Views.Info()
                    });
                    this.getView('#middle-sidebar').render();
                    app.router.navigate('workspace');
                }, this);

                if (this.options.workspace_id)
                    app.trigger('workspace:selected', this.options.workspace_id);
            }
        });

        Views.Info = Backbone.Layout.extend({
            template: 'workspace/info',
            events: {
                'click .show-form': 'toggleForm'
            },
            toggleForm: function () {
                app.trigger('workspace:selected');
            },
            close: function (callback) {
                callback(true);
            }
        });

        Views.List = Backbone.Layout.extend({
            template: 'workspace/list',
            id: "workspaces",
            events: {
                'click .show-form': 'toggleForm',
                'click a': 'selected'
            },
            initialize: function () {
                this.listenTo(this.collection, "sync", this.render);
                this.listenTo(this.collection, "add", this.render);
            },
            serialize: function () {
                return {
                    user: app.global.user,
                    workspaces: this.collection
                };
            },
            selected: function (e) {
                app.trigger('workspace:selected', $(e.target).data('id'));
                return false;
            },
            toggleForm: function () {
                app.trigger('workspace:selected');
                return false;
            }
        });

        Views.Form = Backbone.Layout.extend({
            template: "workspace/form",
            events: {
                'click .submit-form': 'saveWorkspace',
                'click .close-form': 'closeForm',
                'click .watch': 'toggleWatchButton'
            },
            initialize: function () {
                this.listenTo(this.model, 'sync', this.render);
                this.listenTo($(window), 'unload', this.closeForm);
            },
            serialize: function () {
                return {
                    user: app.global.user,
                    workspace: this.model,
                    domain: hostname
                };
            },
            afterRender: function () {
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
                    }
                };

                var initSelection = function (element, callback) {
                    var users = [];
                    $.each(this, function (i, user) {
                        var data = { id: user._id };
                        data.text = user.name ? user.name : user.email;
                        users.push(data);
                    });
                    callback(users);
                };

                $("[name=administrators], [name=users], [name=clients], [name=watchers]", this.$el).css({'opacity': 0});

                $("[name=administrators]", this.$el).select2(_.extend(select2options, {
                    initSelection: _.bind(initSelection, this.model.get('administrators'))
                }));
                $("[name=users]", this.$el).select2(_.extend(select2options, {
                    initSelection: _.bind(initSelection, this.model.get('users'))
                }));
                $("[name=clients]", this.$el).select2(_.extend(select2options, {
                    initSelection: _.bind(initSelection, this.model.get('clients'))
                }));
                $("[name=watchers]", this.$el).select2(_.extend(select2options, {
                    initSelection: _.bind(initSelection, this.model.get('watchers'))
                }));
                $("[name=administrators], [name=users], [name=clients], [name=watchers]", this.$el).on('change', function (e) {
                    $(this).data('prev', '');
                });
                $("[name=administrators], [name=users], [name=clients], [name=watchers]", this.$el).select2('val', []);
                $("[name=administrators], [name=users], [name=clients], [name=watchers]", this.$el).css({'opacity': 1});

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

                $("[name=administrators], [name=users], [name=clients], [name=watchers]", this.$el).on('change', _.bind(function () {
                    this.isDirty = true;
                }, this));
                $("[name=watchers]", this.$el).on('change', _.bind(function () {
                    var data = $("[name=watchers]", this.$el).select2('data');
                    if (_.find(data, function (rec) {
                        return rec.id == app.global.user.id
                    })) {
                        this.updateWatchButton(true);
                    } else {
                        this.updateWatchButton(false);
                    }
                }, this));

                this.isDirty = false;
                this.justSaved = false;

                this.updateWatchButton(this.model.isWatcher(app.global.user))
            },
            updateWatchButton: function (watching) {
                if (watching) {
                    $('.watch', this.el).addClass('active');
                    $('.watch', this.el).text('Watching');
                } else {
                    $('.watch', this.el).removeClass('active');
                    $('.watch', this.el).text('Watch');
                }
            },
            toggleWatchButton: function () {
                var data = $("[name=watchers]", this.$el).select2('data');
                if (_.find(data, function (rec) {
                    return rec.id == app.global.user.id
                })) {
                    data = _.filter(data, function (rec) {
                        return rec.id != app.global.user.id
                    });
                    this.updateWatchButton(false);
                } else {
                    data.push({ id: app.global.user.id, text: app.global.user.escape('name') });
                    this.updateWatchButton(true);
                }
                $("[name=watchers]", this.$el).select2('data', data);
            },
            saveWorkspace: function () {
                var view = this;
                var isNew = this.model.isNew();
                var workspace = new app.models.Workspace();
                var attrs = _.extend({ _id: this.model.id }, this.$el.find('form').serializeObject());
                workspace.save(attrs, {
                    success: function (model) {
                        view.model.set(model.attributes);
                        view.justSaved = true;
                        view.render();
                        if (isNew)
                            view.collection.push(model);
                        app.router.navigate('workspace/' + model.id);
                        app.trigger('workspace:updated', view.model);
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
                        app.trigger('workspace:deselected');
                });
            }
        });

        Views.Watch = Backbone.Layout.extend({
            template: 'workspace/watch',
            events: {
                'click .watch': 'toggleWatch'
            },
            initialize: function () {
                this.listenTo(this.model, 'sync', this.render);
            },
            serialize: function () {
                return {
                    user: app.global.user,
                    domain: hostname,
                    workspace: this.model
                };
            },
            toggleWatch: function () {
                if (this.model.isWatcher(app.global.user)) {
                    this.model.unwatch({
                        error: _.bind(function () {
                            $('.watch', this.$el).addClass('btn-danger');
                            $(this.$el);
                        }, this)
                    });
                } else {
                    this.model.watch({
                        error: _.bind(function () {
                            $('.watch', this.$el).addClass('btn-danger');
                            $(this.$el);
                        }, this)
                    });
                }
            },
            close: function (callback) {
                callback(true);
            },
            closeForm: function () {
                this.close(function (yes) {
                    if (yes)
                        app.trigger('workspace:deselected');
                });
            }
        });

        return Views;
    })
;
