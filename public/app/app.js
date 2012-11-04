define([
    // Libraries.
    "jquery",
    "lodash",
    "backbone",
    "i18next",
    "moment",
    "bootstrap",

    // Plugins.
    "plugins/backbone.layoutmanager",
    "plugins/backbone.syphon",

    // Locales
    "../locales/ru/ru"
],

    function ($, _, Backbone, i18n, moment) {

        // Provide a global location to place configuration settings and module
        // creation.
        var app = {
            // The root path to run the application.
            root: "/"
        };

        var ready = new $.Deferred();

        if (window.I18N) {
            i18n.init({
                load: 'current',
                fallbackLng: 'en',
                resStore: window.I18N
            }, function (t) {
                // will be called instantly, not deferred
                window.t = t;
                moment.lang(i18n.lng());
                ready.resolve();
            });
        } else {
            i18n.init({
                load: 'current',
                fallbackLng: 'en',
                resGetPath: "/locales/__lng__/__ns__.json"
            }, function (t) {
                // called after translations are loaded
                window.t = t;
                moment.lang(i18n.lng());
                ready.resolve();
            });
        }

        // Localize or create a new JavaScript Template object.
        var JST = window.JST = window.JST || {};

        // Configure LayoutManager with Backbone Boilerplate defaults.
        Backbone.LayoutManager.configure({
            // Allow LayoutManager to augment Backbone.View.prototype.
            manage: true,
            prefix: "app/templates/",
            fetch: function (path) {
                // Initialize done for use in async-mode
                var done;

                // Concatenate the file extension.
                path = path + ".html";

                // If cached, use the compiled template.
                if (JST[path]) {
                    return JST[path];
                } else {
                    // Put fetch into `async-mode`.
                    done = this.async();

                    // Seek out the template asynchronously.
                    return $.ajax({
                        url: app.root + path
                    }).then(function (contents) {
                            // templates depend on i18n loaded
                            ready.done(function () {
                                done(JST[path] = _.template(contents));
                            });
                        });
                }
            }
        });

        // Mix Backbone.Events, modules, and layout management into the app object.
        return _.extend(app, {
            // Create a custom object with a nested Views object.
            module: function (additionalProps) {
                return _.extend({
                    Views: {}
                }, additionalProps);
            },

            start: _.once(function () {
                ready.done(function () {
                    // Trigger the initial route and enable HTML5 History API support, set the
                    // root folder to '/' by default.  Change in app.js.
                    Backbone.history.start({
                        pushState: true,
                        root: app.root
                    });
                });
            }),

            // Helper for using layouts.
            useLayout: function (name, options) {
                // If already using this Layout, then don't re-inject into the DOM.
                if (this.layout && this.layout.options.template === name) {
                    return this.layout;
                }

                // If a layout already exists, remove it from the DOM.
                if (this.layout) {
                    this.layout.remove();
                }

                // Create a new Layout with options.
                var layout = new Backbone.Layout(_.extend({
                    template: name,
                    className: "layout " + name,
                    id: "layout"
                }, options));

                // Insert into the DOM.
                $("#main").empty().append(layout.el);

                // Render the layout.
                layout.render();

                // Cache the refererence.
                this.layout = layout;

                // Return the reference, for chainability.
                return layout;
            },
            showModal: function (message) {
                $('#modal .modal-body').html(message);
                $('#modal').modal();
            }
        }, Backbone.Events);

    });
