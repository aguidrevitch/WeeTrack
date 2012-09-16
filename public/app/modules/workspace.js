define([
    // Application.
    "app",
    
    // Views
    "modules/workspace/views"
    ],
    
    function(app, Views) {
        
        var Workspace = app.module();
        
        Workspace.Model = Backbone.Model.extend({
            url: '/api/workspace'
        });
        
        Workspace.Collection = Backbone.Collection.extend({
            model: Workspace.Model
        });
        console.log(app.router);
        
        var Router = Backbone.Router.extend({
            authorized: {
                ':workspace' : "workspace"
            },
            workspace: function (name) {
            // test
            }
        });
        
        Workspace.Router = new Router();
        
        // Return the module for AMD compliance.
        return Workspace;
    
    });
