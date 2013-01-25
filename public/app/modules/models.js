define(["backbone"], function (Backbone) {

    var Models = {};

    Models.Project = Backbone.Model.extend({
        idAttribute: "_id",
        url: function () {
            return this.id ? '/api/project/' + this.id : '/api/project';
        }
    });

    Models.Workspace = Backbone.Model.extend({
        idAttribute: "_id",
        url: function () {
            return this.id ? '/api/workspace/' + this.id : '/api/workspace';
        }
    });

    return Models;
});