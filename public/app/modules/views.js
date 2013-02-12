define(["backbone", "plugins/backbone.layoutmanager"], function (Backbone) {

    var Views = {};

    Views.Form = Backbone.Layout.extend({
        events: {
            'click .watch': 'toggleWatchButton'
        },
        userListSelect2Options: function (options) {
            return _.extend({}, {
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
            }, options);
        },
        userListToSelect2Data: function (users) {
            var data = [];
            _.each(users, function (user) {
                if (user) {
                    var rec = { id: user._id };
                    rec.text = user.name ? user.name : user.email;
                    data.push(rec);
                }
            });
            return(data);
        },
        afterRender: function () {

            $("[name=admin], [name=admincc], [name=cc], [name=watch]", this.$el).select2(
                this.userListSelect2Options()
            );

            _.each(['admin', 'admincc', 'cc', 'watch'], function (perm) {
                if (this.model.get(perm))
                    $("[name=" + perm + "]").select2("data", this.userListToSelect2Data(this.model.get(perm)));
            }, this);

            $("[name=admin], [name=admincc], [name=cc], [name=watch]", this.$el).on('change', function (e) {
                $(this).data('prev', '');
            });

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

            $("[name=admin], [name=admincc], [name=cc], [name=watch]", this.$el).on('change', _.bind(function () {
                this.isDirty = true;
            }, this));

            $("[name=watch]", this.$el).on('change', _.bind(function () {
                var data = $("[name=watch]", this.$el).select2('data');
                if (_.find(data, function (rec) {
                    return rec.id == this.app.global.user.id;
                }, this)) {
                    this.updateWatchButton(true);
                } else {
                    this.updateWatchButton(false);
                }
            }, this));

            this.isDirty = false;
            this.justSaved = false;

            this.updateWatchButton(this.model.isWatcher(this.app.global.user));
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
            var data = $("[name=watch]", this.$el).select2('data');
            if (_.find(data, function (rec) {
                return rec.id == this.app.global.user.id;
            }, this)) {
                data = _.filter(data, function (rec) {
                    return rec.id != this.app.global.user.id;
                }, this);
                this.updateWatchButton(false);
            } else {
                data.push({
                    id: this.app.global.user.id,
                    text: this.app.global.user.escape('name')
                });
                this.updateWatchButton(true);
            }
            $("[name=watch]", this.$el).select2('data', data);
            this.isDirty = true;
        },
        close: function (callback) {
            if (this.isDirty) {
                this.app.showConfirm(t('Unsaved changes'), function (yes) {
                    callback(yes);
                });
            } else {
                callback(true);
            }
        }
    });

    Views.defaultErrorHandler = function (app, model, res) {
        var err;
        try {
            err = ($.parseJSON(res.responseText)).error;
        } catch (e) {
            app.showModal(t('Unknown error'));
            return;
        }

        if (err._modal)
            app.showModal(err._modal.message);

        $(':input + .error', this.$el).html('');
        $(':input', this.$el).parents('.control-group').removeClass('error');

        _.each(err, function (value, field) {
            var selector = '[name="' + field + '"]:input';
            $(selector, this.$el).parents('.control-group').addClass('error');
            $(selector, this.$el).siblings('.error').html(t(value.message));
        });
    };

    return Views;
});
