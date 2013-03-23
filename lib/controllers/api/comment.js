(function () {

    var mongoose = require('mongoose'),
        ObjectId = mongoose.Types.ObjectId,
        Task = mongoose.model('Task'),
        Comment = mongoose.model('Comment'),
        _ = require('lodash');

    module.exports = {
        setup: function (app, helper) {
            /* create */
            app.post('/api/comment/:workspace/:id', function (req, res) {

                var condition = { id: req.params.id };

                try {
                    ObjectId.fromString(req.params.workspace);
                    condition.path = new RegExp("^" + req.params.workspace);
                } catch (e) {
                    res.error(new Error('Workspace not found'));
                    return;
                }

                return Task.findOneWithAccess(req.user, ['admin', 'admincc', 'cc', 'owner'], condition, function (err, task) {
                    if (err) {
                        res.error(err);
                    } else if (!task) {
                        res.json(new Error('Access denied'));
                    } else {

                        var comment = new Comment(_.extend({}, req.body, {
                            creator: req.user,
                            workspace: req.params.workspace,
                            task: task._id
                        }));

                        if (req.query.validate) {
                            comment.validate(function (err) {
                                if (err) {
                                    res.error(err);
                                } else {
                                    res.json(comment);
                                }
                            });
                        } else {
                            comment.save(function (err, model) {
                                if (err) {
                                    res.error(err);
                                } else {
                                    res.json(model);
                                }
                            });
                        }
                    }
                });
            });
        }
    }
})();