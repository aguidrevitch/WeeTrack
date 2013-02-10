(function () {

    var _ = require('lodash');
    var mongoose = require('mongoose');
    var ObjectId = mongoose.Schema.Types.ObjectId;
    var Transaction = require('./transaction');
    var check = require('validator').check;

    var TaskSchema = new mongoose.Schema({
        id: {
            type: Number,
        },
        subject: {
            type: String,
            required: true
        },
        project: {
            type: ObjectId,
            ref: 'Project',
            required: true
        },
        status: {
            type: String,
            required: true
        }
    });

    TaskSchema.plugin(require('./plugins/virtual'), {
        methods: [ 'user', 'workspace', 'filemanager', 'content', 'upload', 'transactions' ]
    });

    TaskSchema.virtual('type').set(function (value) {
        this._type = value;
    });

    TaskSchema.virtual('type').get(function (value) {
        if (this.isNew)
            return 'reply';
        else
            return this._type;
    });

    TaskSchema.plugin(require('./plugins/changedattributes'));

    TaskSchema.path('status').validate(function (value, next) {
        console.log('validate status');
        if (_.indexOf(['new', 'open', 'closed', 'resolved'], value) == -1) {
            next(false);
        } else {
            next();
        }
    }, 'exists');

    TaskSchema.pre('validate', function (next) {
        console.log('pre validate 1');
        if (!this.content) {
            this.invalidate('content', "Validator 'required' failed for path content");
        }
        next();
    });

    TaskSchema.pre('validate', function (next) {
        var self = this;
        console.log('pre validate 2');
        self.model('User').findById(this.creator, function (err, user) {
            if (err) {
                next(err)
            } else if (!user) {
                self.invalidate('creator', "Validator 'exists' failed for path creator");
                next();
            } else {
                // must be at least client to create task and assign it to the project
                self.model('Project').findByIdWithAccess(self.user, ['admin', 'admincc', 'cc'], self.project, function (err, project) {
                    if (err) {
                        next(err)
                    } else if (!project) {
                        self.invalidate('project', 'allowed');
                        next();
                    } else {
                        self.set('workspace', project.workspace);
                        next();
                    }
                });
            }
        });
    });

    TaskSchema.pre('save', function (next) {
        var self = this;
        console.log('pre save 1');
        this.workspace.getNextTicketId(function (err, workspace) {
            self.id = workspace.counter;
            next();
        });
    });

    TaskSchema.post('save', function (next) {
        console.log('post save 1');
        // content field was already validated
        var transactions = [];

        if (this.content) {
            transactions.push(new Transaction({
                type: this.type,
                subtype: 'content',
                content: this.content
            }));
        }

        var self = this;
        async.parallel(
            _.map(transactions, function (transaction) {
                return function (callback) {
                    transaction.save(callback);
                };
            }), function (err, result) {
                self.getTransactions(function (err, result) {
                    next();
                });
            });
    });

    TaskSchema.method.getTransactions = function (callback) {
        console.log('getTransactions');
        var access = this.user.getAccessTo(this.path);

        var type = 'cc';
        if (_.indexOf(access, 'admin') != -1 || _.indexOf(access, 'admincc') != -1)
            type = 'reply'

        var self = this;
        this.model('Transaction').find({ task: self._id, type: type }, function (err, result) {
            if (err) {
                callback(err)
            } else {
                self.transactions = result;
                callback(null, result);
            }
        })
    };

    // to register withaccess' pre-save after ours
    TaskSchema.plugin(require('./plugins/object'), {
        subject: 'User',
        creatorPermission: 'cc',
        permissions: {
            'admin': true,
            'admincc': true,
            'cc': true,
            'watch': true,
            'owner': false
        },
        key: function () {
            return 'id';
        },
        pathBuilder: function (callback) {
            var self = this;
            this.model('Project').findById(this.project, function (err, project) {
                callback(err, project.workspace + '_' + self.project + '_' + self.id)
            });
        },
        extractId: function (key) {
            return key[2];
        }
    });

    module.exports = mongoose.model('Task', TaskSchema);

})();