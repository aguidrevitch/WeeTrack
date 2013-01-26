define([
    "app",

    // Libs
    "backbone",
    "jquery",
    "lodash"
],

    function (app, Backbone, $, _) {

        var Views = {};

        Views.TopNavigation = Backbone.Layout.extend({
            tagName: 'ul',
            className: 'nav pull-right',
            template: "auth/navigation-top",
            chunks: {},
            initialize: function () {
                this.listenTo(this.model, 'change', this.render);
                this.listenTo(app, 'navigation-top:add', function (id, html) {
                    this.chunks[id] = html;
                    this.render();
                }, this);
            },
            afterRender: function () {
                _.each(this.chunks, function (chunk, id) {
                    $('#navigation-top-extend').append(html);
                });
            },
            serialize: function () {
                return {
                    user: this.model
                };
            }
        });

        Views.LoginForm = Backbone.Layout.extend({
            template: "auth/login-form",
            events: {
                "submit form": "login"
            },
            initialize: function () {
                this.listenTo(this.model, 'change', this.render);
            },
            login: function () {
                var data = this.$el.find('form').serializeObject();
                this.model.authorize(data, {
                    error: function (err) {
                        if (err._modal)
                            app.showModal(err._modal.message);
                    },
                    success: function () {
                        if (location.pathname.indexOf('/login') !== 0)
                            app.router.navigate(location.pathname, true);
                            //Backbone.history.loadUrl(location.pathname);
                        else
                            app.router.navigate('/search', true);
                    }
                });
                return false;
            }
        });

        Views.RegisterForm = Backbone.Layout.extend({
            template: "auth/register",
            events: {
                "submit form": "register"
            },
            register: function (e) {
                var self = this;
                var data = this.$el.find('form').serializeObject();
                self.model.set(data);
                self.model.save({}, {
                    error: function (model, res) {
                        var err;
                        try {
                            err = ($.parseJSON(res.responseText)).error;
                        } catch (e) {
                            return;
                        }

                        $(':input + .error', self.el).html('');
                        $(':input', self.el).parents('.control-group').removeClass('error');
                        _.each(err, function (value, field) {
                            var selector = '[name="' + field + '"]:input';
                            $(selector, self.el).parents('.control-group').addClass('error');
                            $(selector + ' + .error', self.el).html(t(value.message));
                        });
                    },
                    success: function (model) {
                        app.router.navigate('workspace/add', { trigger: true });
                    }
                });
                return false;
            }
        });

        return Views;

    });
