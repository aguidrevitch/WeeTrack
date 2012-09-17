define([
    // Application.
    "app"
    ],
    
    function(app) {
        
        var Router = Backbone.Router.extend({
            constructor: function(options) {
                options || (options = {});
                if (options.routes)
                    this.routes = options.routes;
                if (options.authorized)
                    this.authorized = options.authorized;
                if (options.unauthorized)
                    this.unauthorized = options.unauthorized;
                
                this._bindRoutes(this.routes);
                this._bindRoutes(this.authorized, function () {
                    if (!Router._authorized) {
                        Backbone.history.trigger('unauthorized');
                        return false;
                    }
                    return true;
                });
                this._bindRoutes(this.unauthorized, function () {
                    return !Router._authorized
                });
                this.initialize.apply(this, arguments);
            },
            _bindRoutes: function(_routes, check) {
                if (!_routes) return;
                var routes = [];
                for (var route in _routes) {
                    routes.unshift([route, _routes[route]]);
                }
                for (var i = 0, l = routes.length; i < l; i++) {
                    this.route(routes[i][0], routes[i][1], this[routes[i][1]], check);
                }
            },
            route: function(route, name, callback, check) {
                Backbone.history || (Backbone.history = new Backbone.History);
                if (!_.isRegExp(route)) route = this._routeToRegExp(route);
                if (!callback) callback = this[name];
                Backbone.history.route(route, _.bind(function(fragment) {
                    if (check && !check.call(this))
                        return;
                    var args = this._extractParameters(route, fragment);
                    callback && callback.apply(this, args);
                    this.trigger.apply(this, ['route:' + name].concat(args));
                    Backbone.history.trigger('route', this, name, args);
                }, this));
                return this;
            },
            setAuthorized: function (value) {
                Router._authorized = value;
            }
        });
        
        return Router;
    
    });
