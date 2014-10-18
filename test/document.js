var config = require(__dirname+'/../config.js');
var thinky = require(__dirname+'/../lib/thinky.js')(config);
var r = thinky.r;
var Errors = thinky.Errors;

var util = require(__dirname+'/util.js');
var assert = require('assert');

describe('save', function() {
    describe('Basic', function() {
        var Model;
        before(function() {
            var name = util.s8();
            Model = thinky.createModel(name, {
                id: String,
                str: String,
                num: Number
            })
        });
        it('Save should change the status of the doc', function(done){
            var str = util.s8();
            var num = util.random();

            doc = new Model({
                str: str,
                num: num
            })
            assert.equal(doc.isSaved(), false);
            doc.save().then(function(result) {
                assert.equal(doc.isSaved(), true);
                done();
            }).error(done);
        });
        it('Save should work with a callback', function(done){
            var str = util.s8();
            var num = util.random();

            doc = new Model({
                str: str,
                num: num
            })
            assert.equal(doc.isSaved(), false);
            doc.save(function(err, result) {
                if (!err) {
                    assert.equal(doc.isSaved(), true);
                    done();
                }
            });
        });
        it('Save should fail if the primary key already exists', function(done){
            var str = util.s8();
            var num = util.random();

            doc = new Model({
                id: str
            })
            doc.save().then(function(result) {
                doc2 = new Model({
                    id: str
                })
                doc2.save().then(function(r) {
                    done(new Error("Expecting error"))
                }).error(function(error) {
                    assert(error.message.match(/^Duplicate primary key/));
                    done();
                });
            }).error(done);
        });

        it('setSaved should do the same', function(){
            var str = util.s8();
            var num = util.random();

            doc = new Model({
                str: str,
                num: num
            })
            assert.equal(doc.isSaved(), false);
            assert.equal(doc.setSaved());
            assert.equal(doc.isSaved(), true);
        });

        it('Save when the table is not yet ready', function(done){
            var str = util.s8();
            var num = util.random();

            doc = new Model({
                str: str,
                num: num
            })
            doc.save().then(function(result) {
                done();

            }).error(done);
        });
        it('Save then the table is ready', function(done){
            var str = util.s8();
            var num = util.random();

            doc = new Model({
                str: str,
                num: num
            })
            doc.save().then(function(result) {
                done();
            }).error(done);
        });
        it('Save the document should be updated on place', function(done){
            var str = util.s8();
            var num = util.random();

            doc = new Model({
                str: str,
                num: num
            })
            doc.save().then(function(result) {
                assert.strictEqual(doc, result);
                assert.equal(doc.str, str);
                assert.equal(doc.num, num);
                assert.notEqual(doc.id, undefined);
                done();
            }).error(done);
        });
        it('Save should be able to update a doc', function(done){
            var str = util.s8();
            var num = util.random();

            doc = new Model({
                str: str,
                num: num
            })
            doc.save().then(function(result) {
                assert.strictEqual(doc, result);
                var newStr = util.s8();
                doc.str = newStr;
                doc.save().then(function(result) {
                    Model.get(doc.id).run().then(function(result) {
                        assert.equal(doc.str, newStr);
                        done();
                    });
                });
            }).error(done);
        });
        it('Updating a document should keep a reference to the old value ', function(done){
            var str = util.s8();
            var num = util.random();

            doc = new Model({
                str: str,
                num: num
            })
            doc.save().then(function(result) {
                assert.strictEqual(doc, result);
                var newStr = util.s8();
                doc.str = newStr;
                doc.save().then(function(result) {
                    assert.deepEqual(doc.getOldValue(), {
                        id: doc.id,
                        str: str,
                        num: num
                    });
                    done();
                });
            }).error(done);
        });
        it('Updating a document should validate it first (and in case of failure, it should not be persisted in the db)', function(done){
            var str = util.s8();
            var num = util.random();

            doc = new Model({
                str: str,
                num: num
            })
            doc.save().then(function(result) {
                assert.strictEqual(doc, result);
                doc.str = 2
                doc.save().then(function(result) {
                    done(new Error("Expecting an error"))
                }).error(function() {
                    Model.get(doc.id).run().then(function(result) {
                        // Make sure that the document was not updated
                        assert.equal(result.str, str);
                        done();
                    }).error(done);
                });
            }).error(done);
        });
        it('Regression #117 - #118', function(done){
            var t = new Model({
                id: util.s8(),
                extra: {nested: 1}
            });
            t.save().then(function(result) {
                assert.equal(result.extra.nested, 1)
                done()
            }).error(done)
        });
    });
    describe("Replacement", function() {
        it('Date as string should be coerced to ReQL dates', function(done){
            var Model = thinky.createModel(util.s8(), {
                id: String,
                date: Date
            })
            var t = new Model({
                id: util.s8(),
                date: (new Date()).toISOString()
            });

            t.save().then(function(result) {
                assert(t.date instanceof Date)

                return Model.get(t.id).execute({timeFormat: "raw"})
            }).then(function(result) {
                assert.equal(Object.prototype.toString.call(result.date), "[object Object]");
                assert.equal(result.date.$reql_type$, "TIME");
                done()
            }).error(done)
        });
        it('Points as array should be coerced to ReQL points', function(done){
            var Model = thinky.createModel(util.s8(), {
                id: String,
                loc: "Point"
            })
            var t = new Model({
                id: util.s8(),
                loc: [1,1]
            });

            t.save().then(function(result) {
                Model.get(t.id).execute().then(function(result) {
                    assert.equal(t.loc.$reql_type$, "GEOMETRY")
                    assert.equal(t.loc.type, "Point")
                    assert(Array.isArray(t.loc.coordinates))
                    done()
                }).error(done);
            }).error(done)
        });
        it('Points as objects should be coerced to ReQL points', function(done){
            var Model = thinky.createModel(util.s8(), {
                id: String,
                loc: "Point"
            })
            var t = new Model({
                id: util.s8(),
                loc: {latitude: 1, longitude: 2}
            });

            t.save().then(function(result) {
                return Model.get(t.id).execute()
            }).then(function(result) {
                assert.equal(t.loc.$reql_type$, "GEOMETRY")
                assert(Array.isArray(t.loc.coordinates))
                done()
            }).error(done)
        });
        it('Points as geojson should be coerced to ReQL points', function(done){
            var Model = thinky.createModel(util.s8(), {
                id: String,
                loc: "Point"
            })
            var t = new Model({
                id: util.s8(),
                loc: {type: "Point", coordinates: [1, 2]}
            });

            t.save().then(function(result) {
                return Model.get(t.id).execute()
            }).then(function(result) {
                assert.equal(t.loc.$reql_type$, "GEOMETRY")
                assert(Array.isArray(t.loc.coordinates))
                done()
            }).error(done)
        });
    });
    describe("Joins - hasOne", function() {
        var Model, OtherModel;
        before(function() {
            var name = util.s8();
            Model = thinky.createModel(name, {
                id: String,
                str: String,
                num: Number
            })

            var otherName = util.s8();
            OtherModel = thinky.createModel(otherName, {
                id: String,
                str: String,
                num: Number,
                foreignKey: String
            })
            Model.hasOne(OtherModel, "otherDoc", "id", "foreignKey")
        });

        it('save should save only one doc', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var otherDocValues = {str: util.s8(), num: util.random()}

            var doc = new Model(docValues);
            var otherDoc = new OtherModel(otherDocValues);
            doc.otherDoc = otherDoc;
            doc.save().then(function(doc) {
                assert.equal(doc.isSaved(), true);
                assert.equal(doc.otherDoc.isSaved(), false);
                assert.equal(typeof doc.id, 'string')
                assert.equal(doc.str, docValues.str);
                assert.equal(doc.num, docValues.num);
                done();
            }).error(done);
        });
        it('new should create instances of Document for joined documents too', function() {
            var docValues = {str: util.s8(), num: util.random(), otherDoc: {str: util.s8(), num: util.random()}}
            doc = new Model(docValues);
            assert.equal(doc._getModel()._name, Model.getTableName())
            assert.equal(doc.otherDoc._getModel()._name, OtherModel.getTableName())
        });
        it('save should not change the joined document', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var otherDocValues = {str: util.s8(), num: util.random()}

            var doc = new Model(docValues);
            var otherDoc = new OtherModel(otherDocValues);
            doc.otherDoc = otherDoc;
            doc.save().then(function(doc) {
                assert.strictEqual(doc.otherDoc, otherDoc)
                done();
            }).error(done);
        })
        it('saveAll should save everything', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var otherDocValues = {str: util.s8(), num: util.random()}

            var doc = new Model(docValues);
            var otherDoc = new OtherModel(otherDocValues);
            doc.otherDoc = otherDoc;
            doc.saveAll().then(function(doc) {
                assert.equal(doc.isSaved(), true);
                assert.equal(doc.otherDoc.isSaved(), true);
                assert.equal(typeof doc.id, 'string')
                assert.equal(doc.str, docValues.str);
                assert.equal(doc.num, docValues.num);

                assert.strictEqual(doc.otherDoc, otherDoc)
                assert.strictEqual(doc.otherDoc.foreignKey, doc.id)
                done();
            }).error(done);
        })
    });
    describe("Joins - belongsTo", function() {
        var Model, OtherModel;
        before(function() {
            var name = util.s8();
            Model = thinky.createModel(name, {
                id: String,
                str: String,
                num: Number,
                foreignKey: String
            })

            var otherName = util.s8();
            OtherModel = thinky.createModel(otherName, {
                id: String,
                str: String,
                num: Number
            })
            Model.belongsTo(OtherModel, "otherDoc", "foreignKey", "id")
        });
        it('save should save only one doc', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var otherDocValues = {str: util.s8(), num: util.random()}

            var doc = new Model(docValues);
            var otherDoc = new OtherModel(otherDocValues);
            doc.otherDoc = otherDoc;
            doc.save().then(function(doc) {
                assert.equal(doc.isSaved(), true);
                assert.equal(doc.otherDoc.isSaved(), false);
                assert.equal(typeof doc.id, 'string')
                assert.equal(doc.str, docValues.str);
                assert.equal(doc.num, docValues.num);
                done();
            }).error(done);
        })
        it('save should not change the joined document', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var otherDocValues = {str: util.s8(), num: util.random()}

            var doc = new Model(docValues);
            var otherDoc = new OtherModel(otherDocValues);
            doc.otherDoc = otherDoc;
            doc.save().then(function(doc) {
                assert.strictEqual(doc.otherDoc, otherDoc)
                done();
            }).error(done);
        })
        it('saveAll should save everything', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var otherDocValues = {str: util.s8(), num: util.random()}

            var doc = new Model(docValues);
            var otherDoc = new OtherModel(otherDocValues);
            doc.otherDoc = otherDoc;
            doc.saveAll().then(function(doc2) {
                assert.equal(doc.isSaved(), true);
                assert.equal(doc.otherDoc.isSaved(), true);
                assert.equal(typeof doc.id, 'string')
                assert.equal(doc.str, docValues.str);
                assert.equal(doc.num, docValues.num);

                assert.strictEqual(doc.otherDoc, otherDoc)
                assert.strictEqual(doc.foreignKey, doc.otherDoc.id)
                done();
            }).error(done);
        })
        it('saveAll should save a referene to this in the belongsTo doc', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var otherDocValues = {str: util.s8(), num: util.random()}

            var doc = new Model(docValues);
            var otherDoc = new OtherModel(otherDocValues);
            doc.otherDoc = otherDoc;
            doc.saveAll().then(function(doc2) {
                assert.equal(doc.otherDoc.__proto__._parents._belongsTo[Model.getTableName()][0].doc, doc);
                done();
            }).error(done);
        })
        it('saveAll should delete a reference of belongsTo if the document was removed', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var otherDocValues = {str: util.s8(), num: util.random()}

            var doc = new Model(docValues);
            var otherDoc = new OtherModel(otherDocValues);
            doc.otherDoc = otherDoc;
            doc.saveAll().then(function(doc2) {
                assert.equal(doc.isSaved(), true);
                assert.equal(doc.otherDoc.isSaved(), true);

                delete doc.otherDoc;
                doc.saveAll().then(function(doc2) {
                    assert.equal(doc.isSaved(), true);
                    assert.equal(doc.otherId, undefined);

                    done();
                })
            }).error(done);
        })
        it('saveAll should delete a reference of belongsTo only if the document was first retrieved', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var otherDocValues = {str: util.s8(), num: util.random()}

            var doc = new Model(docValues);
            var otherDoc = new OtherModel(otherDocValues);
            doc.otherDoc = otherDoc;
            doc.saveAll().then(function(doc2) {
                assert.equal(doc.isSaved(), true);
                assert.equal(doc.otherDoc.isSaved(), true);

                Model.get(doc.id).run().then(function(result1) {
                    result1.saveAll().then(function(result2) {
                        assert.strictEqual(result1, result2)
                        assert.equal(result2.foreignKey, doc.foreignKey);
                        assert.notEqual(result2.foreignKey, undefined);
                        assert.notEqual(result2.foreignKey, null);
                        Model.get(doc.id).getJoin().run().then(function(result) {
                            assert.equal(result.isSaved(), true);
                            assert.equal(result.otherDoc.isSaved(), true);
                            done();
                        });
                    });
                });
            }).error(done);
        });
    });

    describe("Joins - hasMany", function() {
        var Model, OtherModel;
        before(function() {
            var name = util.s8();
            Model = thinky.createModel(name, {
                id: String,
                str: String,
                num: Number
            })

            var otherName = util.s8();
            OtherModel = thinky.createModel(otherName, {
                id: String,
                str: String,
                num: Number,
                foreignKey: String
            })
            Model.hasMany(OtherModel, "otherDocs", "id", "foreignKey")
        });

        it('save should save only one doc', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var doc = new Model(docValues);
            var otherDocs = [new OtherModel({str: util.s8(), num: util.random()}), new OtherModel({str: util.s8(), num: util.random()}), new OtherModel({str: util.s8(), num: util.random()})];
            doc.otherDocs = otherDocs;

            doc.save().then(function(doc) {
                assert.equal(doc.isSaved(), true);
                for(var i=0; i<otherDocs.length; i++) {
                    assert.equal(doc.otherDocs[i].isSaved(), false);
                }
                assert.equal(typeof doc.id, 'string')
                assert.equal(doc.str, docValues.str);
                assert.equal(doc.num, docValues.num);
                done();
            }).error(done);
        })
        it('save should not change the joined document', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var doc = new Model(docValues);
            var otherDocs = [new OtherModel({str: util.s8(), num: util.random()}), new OtherModel({str: util.s8(), num: util.random()}), new OtherModel({str: util.s8(), num: util.random()})];
            doc.otherDocs = otherDocs;

            doc.save().then(function(doc) {
                assert.strictEqual(doc.otherDocs, otherDocs)
                done();
            }).error(done);
        })
        it('saveAll should save everything', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var doc = new Model(docValues);
            var otherDocs = [new OtherModel({str: util.s8(), num: util.random()}), new OtherModel({str: util.s8(), num: util.random()}), new OtherModel({str: util.s8(), num: util.random()})];
            doc.otherDocs = otherDocs;

            doc.saveAll().then(function(doc) {
                assert.equal(doc.isSaved(), true);
                for(var i=0; i<otherDocs.length; i++) {
                    assert.equal(doc.otherDocs[i].isSaved(), true);
                }
                assert.equal(typeof doc.id, 'string')
                assert.equal(doc.str, docValues.str);
                assert.equal(doc.num, docValues.num);

                assert.strictEqual(doc.otherDocs, otherDocs)
                for(var i=0; i<otherDocs.length; i++) {
                    assert.strictEqual(doc.otherDocs[i].foreignKey, doc.id)
                }
                done();
            }).error(done);
        })
        it('saveAll should not throw if the joined documents are missing', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var doc = new Model(docValues);

            doc.saveAll().then(function(doc) {
                done();
            }).error(done);
        })

    });
    describe("Joins - hasAndBelongsToMany", function() {
        var Model, OtherModel;
        before(function() {
            var name = util.s8();
            Model = thinky.createModel(name, {
                id: String,
                str: String,
                num: Number
            })

            var otherName = util.s8();
            OtherModel = thinky.createModel(otherName, {
                id: String,
                str: String,
                num: Number
            })
            Model.hasAndBelongsToMany(OtherModel, "otherDocs", "id", "id")
        });
        it('save shouls save only one doc', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var doc = new Model(docValues);
            var otherDocs = [new OtherModel({str: util.s8(), num: util.random()}), new OtherModel({str: util.s8(), num: util.random()}), new OtherModel({str: util.s8(), num: util.random()})];
            doc.otherDocs = otherDocs;

            doc.save().then(function(doc) {
                assert.equal(doc.isSaved(), true);
                for(var i=0; i<otherDocs.length; i++) {
                    assert.equal(doc.otherDocs[i].isSaved(), false);
                }
                assert.equal(typeof doc.id, 'string')
                assert.equal(doc.str, docValues.str);
                assert.equal(doc.num, docValues.num);
                done();
            }).error(done);
        })
        it('save should not change the joined document', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var doc = new Model(docValues);
            var otherDocs = [
                new OtherModel({str: util.s8(), num: util.random()}),
                new OtherModel({str: util.s8(), num: util.random()}),
                new OtherModel({str: util.s8(), num: util.random()})
            ];
            doc.otherDocs = otherDocs;

            doc.save().then(function(doc) {
                assert.strictEqual(doc.otherDocs, otherDocs)
                done();
            }).error(done);
        })
        it('saveAll should save everything', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var doc = new Model(docValues);
            var otherDocs = [
                new OtherModel({str: util.s8(), num: util.random()}),
                new OtherModel({str: util.s8(), num: util.random()}),
                new OtherModel({str: util.s8(), num: util.random()})
            ];
            doc.otherDocs = otherDocs;

            doc.saveAll().then(function(doc) {
                for(var i=0; i<otherDocs.length; i++) {
                    assert.equal(doc.otherDocs[i].isSaved(), true);
                    assert.equal(typeof doc.otherDocs[i].id, 'string');
                }

                var linkName;
                if(Model.getTableName() < OtherModel.getTableName()) {
                    linkName = Model.getTableName()+"_"+OtherModel.getTableName();
                }
                else {
                    linkName = OtherModel.getTableName()+"_"+Model.getTableName();
                }

                r.table(linkName).run().then(function(result) {
                    assert.equal(result.length, 3)

                    assert.equal(doc.isSaved(), true);
                    assert.equal(typeof doc.id, 'string')
                    assert.equal(doc.str, docValues.str);
                    assert.equal(doc.num, docValues.num);

                    assert.strictEqual(doc.otherDocs, otherDocs)
                    done();
                })

            }).error(done);
        })
        it('saveAll should create new links with the good id', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var doc = new Model(docValues);
            var otherDocs = [
                new OtherModel({str: util.s8(), num: util.random()}),
                new OtherModel({str: util.s8(), num: util.random()}),
                new OtherModel({str: util.s8(), num: util.random()})
            ];
            doc.otherDocs = otherDocs;

            doc.saveAll().then(function(doc) {
                var linkName, found;

                if(Model.getTableName() < OtherModel.getTableName()) {
                    linkName = Model.getTableName()+"_"+OtherModel.getTableName();
                }
                else {
                    linkName = OtherModel.getTableName()+"_"+Model.getTableName();
                }
                r.table(linkName).run().then(function(result) {
                    var total = 0;
                    // Check id
                    for(var i=0; i<result.length; i++) {
                        found = false
                        for(var j=0; j<otherDocs.length; j++) {
                            if (Model.getTableName() < OtherModel.getTableName()) {
                                if (result[i].id === doc.id+"_"+otherDocs[j].id) {
                                    total++;
                                    found = true;
                                    break;
                                }
                            }
                            else {
                                if (result[i].id === otherDocs[j].id+"_"+doc.id) {
                                    total++;
                                    found = true;
                                    break;
                                }
                            }
                        }
                    }
                    assert.equal(total, 3);

                    done();
                }).error(done);
            }).error(done);
        })
        it('saveAll should create new links with the secondary value', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var doc = new Model(docValues);
            var otherDocs = [
                new OtherModel({str: util.s8(), num: util.random()}),
                new OtherModel({str: util.s8(), num: util.random()}),
                new OtherModel({str: util.s8(), num: util.random()})
            ];
            doc.otherDocs = otherDocs;

            doc.saveAll().then(function(doc) {
                for(var i=0; i<otherDocs.length; i++) {
                    assert.equal(doc.otherDocs[i].isSaved(), true);
                    assert.equal(typeof doc.otherDocs[i].id, 'string');
                }

                var linkName, found;

                if(Model.getTableName() < OtherModel.getTableName()) {
                    linkName = Model.getTableName()+"_"+OtherModel.getTableName();
                }
                else {
                    linkName = OtherModel.getTableName()+"_"+Model.getTableName();
                }
                r.table(linkName).run().then(function(result) {
                    var total = 0;
                    // Testing the values of the primary key
                    for(var i=0; i<result.length; i++) {
                        if (result[i][Model.getTableName()+"_id"] ===  doc.id) {
                            found = false;
                            for(var j=0; j<otherDocs.length; j++) {
                                if (result[i][OtherModel.getTableName()+"_id"] === otherDocs[j].id) {
                                    total++;
                                    found = true;
                                    break;
                                }
                            }
                            assert(found);
                        }
                    }

                    assert.equal(total, 3);
                    done();
                }).error(done);

                
            }).error(done);
        })
        it('saveAll should delete links if they are missing', function(done) {
            var linkName;
            var docValues = {str: util.s8(), num: util.random()}
            var doc = new Model(docValues);
            var otherDocs = [
                new OtherModel({str: util.s8(), num: util.random()}),
                new OtherModel({str: util.s8(), num: util.random()}),
                new OtherModel({str: util.s8(), num: util.random()})
            ];
            doc.otherDocs = otherDocs;

            doc.saveAll().then(function(doc) {
                doc.otherDocs.splice(1, 1);
                doc.saveAll().then(function(result) {
                    assert.equal(result.otherDocs.length, 2);
                    if(Model.getTableName() < OtherModel.getTableName()) {
                        linkName = Model.getTableName()+"_"+OtherModel.getTableName();
                    }
                    else {
                        linkName = OtherModel.getTableName()+"_"+Model.getTableName();
                    }
                    Model.get(doc.id).getJoin().run().then(function(result) {
                        assert.equal(result.otherDocs.length, 2);
                        done();
                    });
                });
            }).error(done);
        })

    });
    
    describe('saveAll with missing docs for hasOne', function() {
        var Model, OtherModel;
        before(function() {
            var name = util.s8();
            Model = thinky.createModel(name, {
                id: String,
                str: String,
                num: Number
            })

            var otherName = util.s8();
            OtherModel = thinky.createModel(otherName, {
                id: String,
                str: String,
                num: Number,
                foreignKey: String
            })

            Model.hasOne(OtherModel, "otherDoc", "id", "foreignKey")
        });
        it('Should update link', function(done) {
            var doc = new Model({
                id: util.s8(),
                str: util.s8(),
                num: util.random()
            })
            var otherDoc = new OtherModel({
                id: util.s8(),
                str: util.s8(),
                num: util.random()
            })
            doc.otherDoc = otherDoc;
            doc.saveAll().then(function() {
                assert(doc.isSaved())
                assert(doc.otherDoc.isSaved())
                doc.otherDoc = null;
                doc.saveAll().then(function() {
                    OtherModel.get(otherDoc.id).run().then(function(result) {
                        assert.equal(result.foreignKey, undefined);
                        done();
                    });
                });
            }).error(done);

        })
    });
    describe('saveAll with missing docs for hasMany', function() {
        var Model, OtherModel;
        before(function() {
            var name = util.s8();
            Model = thinky.createModel(name, {
                id: String,
                str: String,
                num: Number
            })

            var otherName = util.s8();
            OtherModel = thinky.createModel(otherName, {
                id: String,
                str: String,
                num: Number,
                foreignKey: String
            })

            Model.hasMany(OtherModel, "otherDocs", "id", "foreignKey")
        });
        it('Should update link', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var doc = new Model(docValues);
            var otherDocs = [new OtherModel({str: util.s8(), num: util.random()}), new OtherModel({str: util.s8(), num: util.random()}), new OtherModel({str: util.s8(), num: util.random()})];
            doc.otherDocs = otherDocs;

            doc.saveAll().then(function() {
                assert(doc.isSaved())
                for(var i=0; i<doc.otherDocs.length; i++) {
                    assert(doc.otherDocs[i].isSaved())
                }
                var removedDoc = doc.otherDocs.splice(1, 1);
                doc.saveAll().then(function() {
                    OtherModel.getAll(doc.id, {index: "foreignKey"}).run().then(function(result) {
                        assert.equal(result.length, 2);
                        OtherModel.run().then(function(result) {
                            assert.equal(result.length, 3);
                            Model.get(doc.id).getJoin().run().then(function(result) {
                                util.sortById(doc.otherDocs);
                                util.sortById(result.otherDocs);
                                assert.deepEqual(doc, result);
                                done();
                            });
                        });

                    });
                });
            }).error(done);

        })
    });
    describe('saveAll with missing docs for belongsTo', function() {
        var Model, OtherModel;
        before(function() {
            var name = util.s8();
            Model = thinky.createModel(name, {
                id: String,
                str: String,
                num: Number,
                foreignKey: String
            })

            var otherName = util.s8();
            OtherModel = thinky.createModel(otherName, {
                id: String,
                str: String,
                num: Number
            })

            Model.belongsTo(OtherModel, "otherDoc", "foreignKey", "id")
        });
        it('Should update link', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var doc = new Model(docValues);
            var otherDoc = new OtherModel({str: util.s8(), num: util.random()});
            doc.otherDoc = otherDoc;

            doc.saveAll().then(function() {
                assert(doc.isSaved());
                assert.equal(typeof doc.foreignKey, 'string');
                doc.otherDoc = null;
                doc.saveAll().then(function(result) {
                    assert.equal(doc.foreignKey, undefined);
                    OtherModel.run().then(function(result) {
                        assert.equal(result.length, 1);
                        Model.get(doc.id).getJoin().run().then(function(result) {
                            delete doc.otherDoc;
                            assert.deepEqual(result, doc);
                            done();
                        })
                    });
                });
            }).error(done);

        })
    });
    describe('saveAll with missing docs for hasAndBelongsToMany', function() {
        var Model, OtherModel;
        before(function() {
            var name = util.s8();
            Model = thinky.createModel(name, {
                id: String,
                str: String,
                num: Number,
                foreignKey: String
            })

            var otherName = util.s8();
            OtherModel = thinky.createModel(otherName, {
                id: String,
                str: String,
                num: Number
            })

            Model.hasAndBelongsToMany(OtherModel, "otherDocs", "id", "id")
        });
        it('Should remove link', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var doc = new Model(docValues);
            var otherDocs = [new OtherModel({str: util.s8(), num: util.random()}), new OtherModel({str: util.s8(), num: util.random()}), new OtherModel({str: util.s8(), num: util.random()})];
            doc.otherDocs = otherDocs;

            doc.saveAll().then(function() {
                assert(doc.isSaved())
                for(var i=0; i<otherDocs.length; i++) {
                    assert(doc.otherDocs[i].isSaved())
                }
                var removedDoc = doc.otherDocs.splice(1, 1);
                doc.saveAll().then(function(result) {
                    assert.equal(doc.otherDocs.length, 2);
                    assert.equal(result.otherDocs.length, 2);

                    var linkName;
                    if(Model.getTableName() < OtherModel.getTableName()) {
                        linkName = Model.getTableName()+"_"+OtherModel.getTableName();
                    }
                    else {
                        linkName = OtherModel.getTableName()+"_"+Model.getTableName();
                    }
                    r.table(linkName).count().run().then(function(result) {
                        assert.equal(result, 2);

                        Model.get(doc.id).getJoin().run().then(function(result) {
                            assert.equal(result.otherDocs.length, 2);
                            done();
                        }).error(done);
                    }).error(done);
                }).error(done);
            }).error(done);
        })
    });
    describe('modelToSave', function() {
        var Model1, Model2, Model3, Model4, Model5, Model6;
        before(function() {
            Model1 = thinky.createModel(util.s8(), {
                id: String,
                foreignkey31: String
            })

            Model2 = thinky.createModel(util.s8(), {
                id: String,
                foreignkey12: String
            })

            Model3 = thinky.createModel(util.s8(), {
                id: String
            })

            Model4 = thinky.createModel(util.s8(), {
                id: String,
                foreignkey14: String
            })

            Model5 = thinky.createModel(util.s8(), {
                id: String
            })

            Model6 = thinky.createModel(util.s8(), {
                id: String,
                foreignkey26: String
            })



            Model1.hasOne(Model2, "doc2", "id", "foreignkey12")
            Model1.belongsTo(Model3, "doc3", "foreignkey31", "id")
            Model1.hasMany(Model4, "docs4", "id", "foreignkey14")
            Model1.hasAndBelongsToMany(Model5, "docs5", "id", "id")

            Model2.hasOne(Model6, "doc6", "id", "foreignkey26")
        });
        it('save should save only this', function(done) {
            var doc1 = new Model1({})
            var doc2 = new Model2({})
            var doc3 = new Model3({})
            var doc41 = new Model4({})
            var doc42 = new Model4({})
            var doc51 = new Model5({})
            var doc52 = new Model5({})
            var doc6 = new Model6({})
            doc1.doc2 = doc2;
            doc1.doc3 = doc3;
            doc1.docs4 = [doc41, doc42];
            doc1.docs5 = [doc51, doc52];
            doc2.doc6 = doc6;

            doc1.save().then(function() {
                assert.equal(doc1.isSaved(), true);
                assert.equal(doc2.isSaved(), false);
                assert.equal(doc3.isSaved(), false);
                assert.equal(doc41.isSaved(), false);
                assert.equal(doc42.isSaved(), false);
                assert.equal(doc51.isSaved(), false);
                assert.equal(doc52.isSaved(), false);
                assert.equal(doc6.isSaved(), false);
                done();
            }).error(done);
        });
        it('saveAll should save everything', function(done) {
            var doc1 = new Model1({})
            var doc2 = new Model2({})
            var doc3 = new Model3({})
            var doc41 = new Model4({})
            var doc42 = new Model4({})
            var doc51 = new Model5({})
            var doc52 = new Model5({})
            var doc6 = new Model6({})
            doc1.doc2 = doc2;
            doc1.doc3 = doc3;
            doc1.docs4 = [doc41, doc42];
            doc1.docs5 = [doc51, doc52];
            doc2.doc6 = doc6;

            doc1.saveAll().then(function() {
                assert.equal(doc1.isSaved(), true);
                assert.equal(doc2.isSaved(), true);
                assert.equal(doc3.isSaved(), true);
                assert.equal(doc41.isSaved(), true);
                assert.equal(doc42.isSaved(), true);
                assert.equal(doc51.isSaved(), true);
                assert.equal(doc52.isSaved(), true);
                assert.equal(doc6.isSaved(), true);
                done();
            }).error(done);
        });
        it('saveAll should be limited by modelToSave - 1', function(done) {
            var doc1 = new Model1({})
            var doc2 = new Model2({})
            var doc3 = new Model3({})
            var doc41 = new Model4({})
            var doc42 = new Model4({})
            var doc51 = new Model5({})
            var doc52 = new Model5({})
            var doc6 = new Model6({})
            doc1.doc2 = doc2;
            doc1.doc3 = doc3;
            doc1.docs4 = [doc41, doc42];
            doc1.docs5 = [doc51, doc52];
            doc2.doc6 = doc6;

            doc1.saveAll({doc2: true}).then(function() {
                assert.equal(doc1.isSaved(), true);
                assert.equal(doc2.isSaved(), true);
                assert.equal(doc3.isSaved(), false);
                assert.equal(doc41.isSaved(), false);
                assert.equal(doc42.isSaved(), false);
                assert.equal(doc51.isSaved(), false);
                assert.equal(doc52.isSaved(), false);
                assert.equal(doc6.isSaved(), false);
                done();
            }).error(done);
        });
        it('saveAll should be limited by modelToSave - 2', function(done) {
            var doc1 = new Model1({})
            var doc2 = new Model2({})
            var doc3 = new Model3({})
            var doc41 = new Model4({})
            var doc42 = new Model4({})
            var doc51 = new Model5({})
            var doc52 = new Model5({})
            var doc6 = new Model6({})
            doc1.doc2 = doc2;
            doc1.doc3 = doc3;
            doc1.docs4 = [doc41, doc42];
            doc1.docs5 = [doc51, doc52];
            doc2.doc6 = doc6;

            doc1.saveAll({doc2: {doc6: true}}).then(function() {
                assert.equal(doc1.isSaved(), true);
                assert.equal(doc2.isSaved(), true);
                assert.equal(doc3.isSaved(), false);
                assert.equal(doc41.isSaved(), false);
                assert.equal(doc42.isSaved(), false);
                assert.equal(doc51.isSaved(), false);
                assert.equal(doc52.isSaved(), false);
                assert.equal(doc6.isSaved(), true);
                done();
            }).error(done);
        });
        it('saveAll should be limited by modelToSave - 3', function(done) {
            var doc1 = new Model1({})
            var doc2 = new Model2({})
            var doc3 = new Model3({})
            var doc41 = new Model4({})
            var doc42 = new Model4({})
            var doc51 = new Model5({})
            var doc52 = new Model5({})
            var doc6 = new Model6({})
            doc1.doc2 = doc2;
            doc1.doc3 = doc3;
            doc1.docs4 = [doc41, doc42];
            doc1.docs5 = [doc51, doc52];
            doc2.doc6 = doc6;

            doc1.saveAll({doc2: true, docs4: true}).then(function() {
                assert.equal(doc1.isSaved(), true);
                assert.equal(doc2.isSaved(), true);
                assert.equal(doc3.isSaved(), false);
                assert.equal(doc41.isSaved(), true);
                assert.equal(doc42.isSaved(), true);
                assert.equal(doc51.isSaved(), false);
                assert.equal(doc52.isSaved(), false);
                assert.equal(doc6.isSaved(), false);
                done();
            }).error(done);
        });
        it('saveAll should be limited by modelToSave - 4', function(done) {
            var doc1 = new Model1({})
            var doc2 = new Model2({})
            var doc3 = new Model3({})
            var doc41 = new Model4({})
            var doc42 = new Model4({})
            var doc51 = new Model5({})
            var doc52 = new Model5({})
            var doc6 = new Model6({})
            doc1.doc2 = doc2;
            doc1.doc3 = doc3;
            doc1.docs4 = [doc41, doc42];
            doc1.docs5 = [doc51, doc52];
            doc2.doc6 = doc6;

            doc1.saveAll({doc2: true, docs5: true}).then(function() {
                assert.equal(doc1.isSaved(), true);
                assert.equal(doc2.isSaved(), true);
                assert.equal(doc3.isSaved(), false);
                assert.equal(doc41.isSaved(), false);
                assert.equal(doc42.isSaved(), false);
                assert.equal(doc51.isSaved(), true);
                assert.equal(doc52.isSaved(), true);
                assert.equal(doc6.isSaved(), false);
                done();
            }).error(done);
        });
    })
});

describe('delete', function() {
    describe('Basic', function() {
        var Model, doc;
        before(function(done) {
            var name = util.s8();
            Model = thinky.createModel(name, {
                id: String,
                str: String,
                num: Number
            })

            var str = util.s8();
            var num = util.random();

            doc = new Model({
                str: str,
                num: num
            })
            assert.equal(doc.isSaved(), false);
            doc.save().then(function(result) {
                assert.equal(typeof doc.id, 'string');
                assert.equal(doc.isSaved(), true);
                done();
            }).error(done);
        });
        it('should delete the document', function(done) {
            doc.delete().then(function() {
                Model.run().then(function(result) {
                    assert.equal(result.length, 0);
                    done();
                });
            }).error(done);
        });
        it('should work with a callback', function(done) {
            doc.delete().then(function() {
                Model.run(function(err, result) {
                    assert.equal(result.length, 0);
                    done();
                });
            });
        });
        it('should set the doc unsaved', function(done) {
            doc.save().then(function(result) {
                assert.equal(typeof doc.id, 'string');
                assert.equal(doc.isSaved(), true);
                doc.delete().then(function() {
                    Model.run().then(function(result) {
                        assert.equal(doc.isSaved(), false);
                        done();
                    });
                }).error(done);
            }).error(done);
        });
    });
    describe('hasOne', function() {
        var Model, doc, OtherModel;
        before(function() {
            var name = util.s8();
            Model = thinky.createModel(name, {
                id: String,
                str: String,
                num: Number
            })

            var otherName = util.s8();
            OtherModel = thinky.createModel(otherName, {
                id: String,
                str: String,
                num: Number,
                foreignKey: String
            })

            Model.hasOne(OtherModel, "otherDoc", "id", "foreignKey")
        });
        it('delete should delete only the document and update the other', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var otherDocValues = {str: util.s8(), num: util.random()}

            var doc = new Model(docValues);
            var otherDoc = new OtherModel(otherDocValues);
            doc.otherDoc = otherDoc;
            doc.saveAll().then(function(doc) {
                assert.equal(doc.isSaved(), true);

                doc.delete().then(function() {
                    Model.run().then(function(result) {
                        assert.equal(result.length, 0);
                        assert.equal(otherDoc.foreignKey, undefined);

                        OtherModel.run().then(function(result) {
                            assert.equal(result.length, 1);
                            assert.deepEqual(result[0], otherDoc);
                            done();
                        }).error(done);

                    });
                }).error(done);

            })
        });
        it('deleteAll should delete everything', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var otherDocValues = {str: util.s8(), num: util.random()}

            var doc = new Model(docValues);
            var otherDoc = new OtherModel(otherDocValues);
            doc.otherDoc = otherDoc;
            doc.saveAll().then(function(doc) {
                assert.equal(doc.isSaved(), true);

                doc.deleteAll().then(function() {
                    assert.equal(doc.isSaved(), false);
                    assert.equal(otherDoc.isSaved(), false);
                    Model.get(doc.id).run().error(function(error) {
                        assert(error instanceof Errors.DocumentNotFound);
                        OtherModel.get(otherDoc.id).run().error(function(error) {
                            assert(error instanceof Errors.DocumentNotFound);
                            done();
                        });
                    });
                });

            })
        });
        it('deleteAll should delete everything', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var otherDocValues = {str: util.s8(), num: util.random()}

            var doc = new Model(docValues);
            var otherDoc = new OtherModel(otherDocValues);
            doc.otherDoc = otherDoc;
            doc.saveAll().then(function(doc) {
                assert.equal(doc.isSaved(), true);

                doc.deleteAll({otherDoc: true}).then(function() {
                    assert.equal(doc.isSaved(), false);
                    assert.equal(otherDoc.isSaved(), false);
                    Model.get(doc.id).run().error(function(error) {
                        assert(error instanceof Errors.DocumentNotFound);
                        OtherModel.get(otherDoc.id).run().error(function(error) {
                            assert(error instanceof Errors.DocumentNotFound);
                            done();
                        });
                    });
                });

            })
        });
        it('deleteAll with wrong modelToDelete should delete only the document and update the other', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var otherDocValues = {str: util.s8(), num: util.random()}

            var doc = new Model(docValues);
            var otherDoc = new OtherModel(otherDocValues);
            doc.otherDoc = otherDoc;
            doc.saveAll().then(function(doc) {
                assert.equal(doc.isSaved(), true);

                doc.deleteAll({foo: "bar"}).then(function() {
                    Model.run().then(function(result) {
                        assert.equal(result.length, 0);
                        assert.equal(otherDoc.foreignKey, undefined);

                        OtherModel.get(otherDoc.id).run().then(function(result) {
                            assert.deepEqual(result, otherDoc);
                            done();
                        }).error(done);
                    });
                }).error(done);
            })
        });

    });
    describe('belongsTo', function() {
        var Model, doc, OtherModel;
        before(function() {
            var name = util.s8();
            Model = thinky.createModel(name, {
                id: String,
                str: String,
                num: Number,
                foreignKey: String
            })

            var otherName = util.s8();
            OtherModel = thinky.createModel(otherName, {
                id: String,
                str: String,
                num: Number
            })

            Model.belongsTo(OtherModel, "otherDoc", "foreignKey", "id")
        });
        //Why this test was commented?
        it('delete should delete only the document and not update the other', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var otherDocValues = {str: util.s8(), num: util.random()}

            var doc = new Model(docValues);
            var otherDoc = new OtherModel(otherDocValues);
            doc.otherDoc = otherDoc;

            doc.saveAll().then(function(doc) {
                assert.equal(doc.isSaved(), true);

                var otherDocCopy = util.deepCopy(doc.otherDoc);

                doc.delete().then(function() {
                    Model.get(doc.id).run().error(function(error) {
                        assert(error instanceof Errors.DocumentNotFound);

                        OtherModel.get(otherDoc.id).run().then(function(result) {
                            assert.deepEqual(result, otherDoc);
                            assert.deepEqual(result, otherDocCopy);

                            done();
                        });
                    });
                });
            });
        });
        it('deleteAll should delete everything', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var otherDocValues = {str: util.s8(), num: util.random()}

            var doc = new Model(docValues);
            var otherDoc = new OtherModel(otherDocValues);
            doc.otherDoc = otherDoc;

            doc.saveAll().then(function(doc) {
                assert.equal(doc.isSaved(), true);

                doc.deleteAll().then(function(result) {
                    assert.equal(doc.isSaved(), false);
                    assert.equal(otherDoc.isSaved(), false);
                    assert.strictEqual(doc, result);
                    assert.equal(doc.otherDoc, undefined);
                    assert.equal(otherDoc.isSaved(), false);
                    Model.get(doc.id).run().error(function(error) {
                        assert(error instanceof Errors.DocumentNotFound);

                        OtherModel.get(otherDoc.id).run().error(function(error) {
                            assert(error instanceof Errors.DocumentNotFound);
                            done();
                        });
                    });
                });
            });
        });
        it('deleteAll should delete everything when given the appropriate modelToDelete', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var otherDocValues = {str: util.s8(), num: util.random()}

            var doc = new Model(docValues);
            var otherDoc = new OtherModel(otherDocValues);
            doc.otherDoc = otherDoc;

            doc.saveAll().then(function(doc) {
                assert.equal(doc.isSaved(), true);

                doc.deleteAll({otherDoc: true}).then(function(result) {
                    assert.equal(doc.isSaved(), false);
                    assert.equal(otherDoc.isSaved(), false);
                    assert.strictEqual(doc, result);
                    Model.get(doc.id).run().error(function(error) {
                        assert(error instanceof Errors.DocumentNotFound);

                        OtherModel.get(otherDoc.id).run().error(function(error) {
                            assert(error instanceof Errors.DocumentNotFound);
                            done();
                        });
                    });
                });
            })
        });
        it('delete should delete only the document with non matching modelToDelete', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var otherDocValues = {str: util.s8(), num: util.random()}

            var doc = new Model(docValues);
            var otherDoc = new OtherModel(otherDocValues);
            doc.otherDoc = otherDoc;

            doc.saveAll().then(function(doc) {
                assert.equal(doc.isSaved(), true);

                var otherDocCopy = util.deepCopy(doc.otherDoc);

                doc.deleteAll({foo: true}).then(function() {
                    Model.get(doc.id).run().error(function(error) {
                        assert(error instanceof Errors.DocumentNotFound);

                        OtherModel.get(otherDoc.id).run().then(function(result) {
                            assert.deepEqual(result, otherDoc);
                            assert.deepEqual(result, otherDocCopy);

                            done();
                        });
                    });
                });
            });
        });
    });
    describe('hasMany', function() {
        var Model, doc, OtherModel;
        before(function() {
            var name = util.s8();
            Model = thinky.createModel(name, {
                id: String,
                str: String,
                num: Number
            })

            var otherName = util.s8();
            OtherModel = thinky.createModel(otherName, {
                id: String,
                str: String,
                num: Number,
                foreignKey: String
            })

            Model.hasMany(OtherModel, "otherDocs", "id", "foreignKey")
        });
        it('delete should delete only the document and update the other', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var doc = new Model(docValues);
            var otherDocs = [new OtherModel({str: util.s8(), num: util.random()}), new OtherModel({str: util.s8(), num: util.random()}), new OtherModel({str: util.s8(), num: util.random()})];
            doc.otherDocs = otherDocs;

            doc.saveAll().then(function(doc) {
                assert.equal(doc.isSaved(), true);

                doc.delete().then(function() {
                    Model.get(doc.id).run().error(function(error) {
                        assert(error instanceof Errors.DocumentNotFound);
                        assert.equal(doc.isSaved(), false);
                        for(var i=0; i<otherDocs.length; i++) {
                            assert.equal(otherDocs[i].foreignKey, undefined);
                            assert.equal(otherDocs[i].isSaved(), true);
                        }

                        OtherModel.getAll(otherDocs[0].id, otherDocs[1].id, otherDocs[2].id).run().then(function(result) {
                            assert.equal(result.length, 3);
                            assert.deepEqual(util.sortById(result), util.sortById(otherDocs));
                            done();
                        });
                    });
                });
            });
        });
        it('delete should delete only the document and update the other -- non matching modelToDelete', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var doc = new Model(docValues);
            var otherDocs = [new OtherModel({str: util.s8(), num: util.random()}), new OtherModel({str: util.s8(), num: util.random()}), new OtherModel({str: util.s8(), num: util.random()})];
            doc.otherDocs = otherDocs;

            doc.saveAll().then(function(doc) {
                assert.equal(doc.isSaved(), true);

                doc.deleteAll({foo: true}).then(function() {
                    Model.get(doc.id).run().error(function(error) {
                        assert(error instanceof Errors.DocumentNotFound);
                        assert.equal(doc.isSaved(), false);
                        assert.equal(doc.isSaved(), false);
                        for(var i=0; i<otherDocs.length; i++) {
                            assert.equal(otherDocs[i].foreignKey, undefined);
                            assert.equal(otherDocs[i].isSaved(), true);
                        }

                        OtherModel.getAll(otherDocs[0].id, otherDocs[1].id, otherDocs[2].id).run().then(function(result) {
                            assert.equal(result.length, 3);
                            assert.deepEqual(util.sortById(result), util.sortById(otherDocs));
                            done();
                        }).error(done);

                    });
                }).error(done);

            })
        });
        it('deleteAll should delete everything', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var doc = new Model(docValues);
            var otherDocs = [new OtherModel({str: util.s8(), num: util.random()}), new OtherModel({str: util.s8(), num: util.random()}), new OtherModel({str: util.s8(), num: util.random()})];
            doc.otherDocs = otherDocs;

            doc.saveAll().then(function(doc) {
                assert.equal(doc.isSaved(), true);

                doc.deleteAll().then(function(result) {
                    assert.strictEqual(result, doc);
                    Model.get(doc.id).run().error(function(error) {
                        assert(error instanceof Errors.DocumentNotFound);
                        assert.equal(doc.isSaved(), false);
                        for(var i=0; i<otherDocs.length; i++) {
                            assert.equal(otherDocs[i].isSaved(), false);
                            // We want to keep the foreign key -- consistent yet unsaved data
                            assert.notEqual(otherDocs[i].foreignKey, undefined);
                        }

                        OtherModel.getAll(otherDocs[0].id, otherDocs[1].id, otherDocs[2].id).run().then(function(result) {
                            assert.equal(result.length, 0);
                            done();
                        });
                    });
                });
            });
        });
        it('deleteAll should delete everything -- with modelToDelete', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var doc = new Model(docValues);
            var otherDocs = [new OtherModel({str: util.s8(), num: util.random()}), new OtherModel({str: util.s8(), num: util.random()}), new OtherModel({str: util.s8(), num: util.random()})];
            doc.otherDocs = otherDocs;

            doc.saveAll().then(function(doc) {
                assert.equal(doc.isSaved(), true);

                doc.deleteAll({otherDocs: true}).then(function(result) {
                    assert.strictEqual(result, doc);
                    Model.get(doc.id).run().error(function(error) {
                        assert(error instanceof Errors.DocumentNotFound);
                        assert.equal(doc.isSaved(), false);
                        for(var i=0; i<otherDocs.length; i++) {
                            assert.equal(otherDocs[i].isSaved(), false);
                            // We want to keep the foreign key -- consistent yet unsaved data
                            assert.notEqual(otherDocs[i].foreignKey, undefined);
                        }

                        OtherModel.getAll(otherDocs[0].id, otherDocs[1].id, otherDocs[2].id).run().then(function(result) {
                            assert.equal(result.length, 0);
                            done();
                        });
                    });
                });
            });
        });
    });
    describe('hasAndBelongsToMany', function() {
        var Model, doc, OtherModel;
        before(function() {
            var name = util.s8();
            Model = thinky.createModel(name, {
                id: String,
                str: String,
                num: Number
            })

            var otherName = util.s8();
            OtherModel = thinky.createModel(otherName, {
                id: String,
                str: String,
                num: Number
            })

            Model.hasAndBelongsToMany(OtherModel, "otherDocs", "id", "id")
        });
        it('delete should delete only the document and update the other', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var doc = new Model(docValues);
            var otherDocs = [new OtherModel({str: util.s8(), num: util.random()}), new OtherModel({str: util.s8(), num: util.random()}), new OtherModel({str: util.s8(), num: util.random()})];
            doc.otherDocs = otherDocs;

            doc.saveAll().then(function(doc) {
                doc.delete().then(function(result) {
                    assert.strictEqual(doc, result);
                    assert.equal(doc.isSaved(), false);
                    for(var i=0; i<otherDocs.length; i++) {
                        assert.equal(doc.otherDocs[i].isSaved(), true)
                    }
                    Model.get(doc.id).run().error(function(error) {
                        assert(error instanceof Errors.DocumentNotFound);

                        OtherModel.getAll(otherDocs[0].id, otherDocs[1].id, otherDocs[2].id).run().then(function(result) {
                            assert.equal(result.length, 3);
                            assert.deepEqual(util.sortById(result), util.sortById(otherDocs));
                            r.table(Model._joins.otherDocs.link).run().then(function(result) {
                                assert.equal(result.length, 0);
                                done();
                            });
                        });
                    });
                });
            });
        });
        it('deleteAll should delete only the document and update the other -- with non matching modelToDelete', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var doc = new Model(docValues);
            var otherDocs = [new OtherModel({str: util.s8(), num: util.random()}), new OtherModel({str: util.s8(), num: util.random()}), new OtherModel({str: util.s8(), num: util.random()})];
            doc.otherDocs = otherDocs;

            doc.saveAll().then(function(doc) {
                doc.deleteAll({foo: true}).then(function() {
                    assert.equal(doc.isSaved(), false);
                    for(var i=0; i<otherDocs.length; i++) {
                        assert.equal(doc.otherDocs[i].isSaved(), true)
                    }
                    Model.get(doc.id).run().error(function(error) {
                        assert(error instanceof Errors.DocumentNotFound);

                        OtherModel.getAll(otherDocs[0].id, otherDocs[1].id, otherDocs[2].id).run().then(function(result) {
                            assert.equal(result.length, 3);
                            assert.deepEqual(util.sortById(result), util.sortById(otherDocs));
                            r.table(Model._joins.otherDocs.link).run().then(function(result) {
                                assert.equal(result.length, 0);
                                done();
                            }).error(done);
                        }).error(done);

                    });
                }).error(done);

            })
        });
        it('deleteAll should delete everything', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var doc = new Model(docValues);
            var otherDocs = [new OtherModel({str: util.s8(), num: util.random()}), new OtherModel({str: util.s8(), num: util.random()}), new OtherModel({str: util.s8(), num: util.random()})];
            doc.otherDocs = otherDocs;

            doc.saveAll().then(function(doc) {
                doc.deleteAll().then(function() {
                    assert.equal(doc.isSaved(), false);
                    for(var i=0; i<otherDocs.length; i++) {
                        assert.equal(otherDocs[i].isSaved(), false)
                    }
                    Model.get(doc.id).run().error(function(error) {
                        assert(error instanceof Errors.DocumentNotFound);

                        OtherModel.getAll(otherDocs[0].id, otherDocs[1].id, otherDocs[2].id).run().then(function(result) {
                            assert.equal(result.length, 0);

                            r.table(Model._joins.otherDocs.link).run().then(function(result) {
                                assert.equal(result.length, 0);
                                done();
                            }).error(done);
                        }).error(done);

                    });
                }).error(done);

            })
        });
        it('deleteAll should delete everything -- with the appropriate modelToDelete', function(done) {
            var docValues = {str: util.s8(), num: util.random()}
            var doc = new Model(docValues);
            var otherDocs = [new OtherModel({str: util.s8(), num: util.random()}), new OtherModel({str: util.s8(), num: util.random()}), new OtherModel({str: util.s8(), num: util.random()})];
            doc.otherDocs = otherDocs;

            doc.saveAll().then(function(doc) {
                doc.deleteAll({otherDocs: true}).then(function() {
                    assert.equal(doc.isSaved(), false);
                    for(var i=0; i<otherDocs.length; i++) {
                        assert.equal(otherDocs[i].isSaved(), false)
                    }
                    Model.get(doc.id).run().error(function(error) {
                        assert(error instanceof Errors.DocumentNotFound);

                        OtherModel.getAll(otherDocs[0].id, otherDocs[1].id, otherDocs[2].id).run().then(function(result) {
                            assert.equal(result.length, 0);

                            r.table(Model._joins.otherDocs.link).run().then(function(result) {
                                assert.equal(result.length, 0);
                                done();
                            }).error(done);
                        }).error(done);

                    });
                }).error(done);

            })
        });

    });
    describe('modelToDelete', function() {
        var Model1, Model2, Model3, Model4, Model5, Model6;
        before(function() {
            Model1 = thinky.createModel(util.s8(), {
                id: String,
                foreignkey31: String
            })

            Model2 = thinky.createModel(util.s8(), {
                id: String,
                foreignkey12: String
            })

            Model3 = thinky.createModel(util.s8(), {
                id: String
            })

            Model4 = thinky.createModel(util.s8(), {
                id: String,
                foreignkey14: String
            })

            Model5 = thinky.createModel(util.s8(), {
                id: String
            })

            Model6 = thinky.createModel(util.s8(), {
                id: String,
                foreignkey26: String
            })



            Model1.hasOne(Model2, "doc2", "id", "foreignkey12")
            Model1.belongsTo(Model3, "doc3", "foreignkey31", "id")
            Model1.hasMany(Model4, "docs4", "id", "foreignkey14")
            Model1.hasAndBelongsToMany(Model5, "docs5", "id", "id")

            Model2.hasOne(Model6, "doc6", "id", "foreignkey26")
        });
        it('deleteAll should delete everything', function(done) {
            var doc1 = new Model1({})
            var doc2 = new Model2({})
            var doc3 = new Model3({})
            var doc41 = new Model4({})
            var doc42 = new Model4({})
            var doc51 = new Model5({})
            var doc52 = new Model5({})
            var doc6 = new Model6({})
            doc1.doc2 = doc2;
            doc1.doc3 = doc3;
            doc1.docs4 = [doc41, doc42];
            doc1.docs5 = [doc51, doc52];
            doc2.doc6 = doc6;

            doc1.saveAll().then(function() {
                assert.equal(doc1.isSaved(), true);
                assert.equal(doc2.isSaved(), true);
                assert.equal(doc3.isSaved(), true);
                assert.equal(doc41.isSaved(), true);
                assert.equal(doc42.isSaved(), true);
                assert.equal(doc51.isSaved(), true);
                assert.equal(doc52.isSaved(), true);
                assert.equal(doc6.isSaved(), true);
                doc1.deleteAll().then(function() {
                    assert.equal(doc1.isSaved(), false);
                    assert.equal(doc2.isSaved(), false);
                    assert.equal(doc3.isSaved(), false);
                    assert.equal(doc41.isSaved(), false);
                    assert.equal(doc42.isSaved(), false);
                    assert.equal(doc51.isSaved(), false);
                    assert.equal(doc52.isSaved(), false);
                    assert.equal(doc6.isSaved(), false);

                    done();
                });
            }).error(done);
        });
        it('deleteAll should follow modelToDelete if provided - 1', function(done) {
            var doc1 = new Model1({})
            var doc2 = new Model2({})
            var doc3 = new Model3({})
            var doc41 = new Model4({})
            var doc42 = new Model4({})
            var doc51 = new Model5({})
            var doc52 = new Model5({})
            var doc6 = new Model6({})
            doc1.doc2 = doc2;
            doc1.doc3 = doc3;
            doc1.docs4 = [doc41, doc42];
            doc1.docs5 = [doc51, doc52];
            doc2.doc6 = doc6;

            doc1.saveAll().then(function() {
                assert.equal(doc1.isSaved(), true);
                assert.equal(doc2.isSaved(), true);
                assert.equal(doc3.isSaved(), true);
                assert.equal(doc41.isSaved(), true);
                assert.equal(doc42.isSaved(), true);
                assert.equal(doc51.isSaved(), true);
                assert.equal(doc52.isSaved(), true);
                assert.equal(doc6.isSaved(), true);
                doc1.deleteAll({doc2: true}).then(function() {
                    assert.equal(doc1.isSaved(), false);
                    assert.equal(doc2.isSaved(), false);
                    assert.equal(doc3.isSaved(), true);
                    assert.equal(doc41.isSaved(), true);
                    assert.equal(doc42.isSaved(), true);
                    assert.equal(doc51.isSaved(), true);
                    assert.equal(doc52.isSaved(), true);
                    assert.equal(doc6.isSaved(), true);
                    done();
                });
            }).error(done);
        });
        it('deleteAll should follow modelToDelete if provided - 2', function(done) {
            var doc1 = new Model1({})
            var doc2 = new Model2({})
            var doc3 = new Model3({})
            var doc41 = new Model4({})
            var doc42 = new Model4({})
            var doc51 = new Model5({})
            var doc52 = new Model5({})
            var doc6 = new Model6({})
            doc1.doc2 = doc2;
            doc1.doc3 = doc3;
            doc1.docs4 = [doc41, doc42];
            doc1.docs5 = [doc51, doc52];
            doc2.doc6 = doc6;

            doc1.saveAll().then(function() {
                assert.equal(doc1.isSaved(), true);
                assert.equal(doc2.isSaved(), true);
                assert.equal(doc3.isSaved(), true);
                assert.equal(doc41.isSaved(), true);
                assert.equal(doc42.isSaved(), true);
                assert.equal(doc51.isSaved(), true);
                assert.equal(doc52.isSaved(), true);
                assert.equal(doc6.isSaved(), true);
                doc1.deleteAll({doc2: {doc6: true}}).then(function() {
                    assert.equal(doc1.isSaved(), false);
                    assert.equal(doc2.isSaved(), false);
                    assert.equal(doc3.isSaved(), true);
                    assert.equal(doc41.isSaved(), true);
                    assert.equal(doc42.isSaved(), true);
                    assert.equal(doc51.isSaved(), true);
                    assert.equal(doc52.isSaved(), true);
                    assert.equal(doc6.isSaved(), false);

                    done();
                });
            }).error(done);
        });
        it('deleteAll should follow modelToDelete if provided - 3', function(done) {
            var doc1 = new Model1({})
            var doc2 = new Model2({})
            var doc3 = new Model3({})
            var doc41 = new Model4({})
            var doc42 = new Model4({})
            var doc51 = new Model5({})
            var doc52 = new Model5({})
            var doc6 = new Model6({})
            doc1.doc2 = doc2;
            doc1.doc3 = doc3;
            doc1.docs4 = [doc41, doc42];
            doc1.docs5 = [doc51, doc52];
            doc2.doc6 = doc6;

            doc1.saveAll().then(function() {
                assert.equal(doc1.isSaved(), true);
                assert.equal(doc2.isSaved(), true);
                assert.equal(doc3.isSaved(), true);
                assert.equal(doc41.isSaved(), true);
                assert.equal(doc42.isSaved(), true);
                assert.equal(doc51.isSaved(), true);
                assert.equal(doc52.isSaved(), true);
                assert.equal(doc6.isSaved(), true);
                doc1.deleteAll({doc2: true, docs4: true}).then(function() {
                    assert.equal(doc1.isSaved(), false);
                    assert.equal(doc2.isSaved(), false);
                    assert.equal(doc3.isSaved(), true);
                    assert.equal(doc41.isSaved(), false);
                    assert.equal(doc42.isSaved(), false);
                    assert.equal(doc51.isSaved(), true);
                    assert.equal(doc52.isSaved(), true);
                    assert.equal(doc6.isSaved(), true);

                    done();
                });
            }).error(done);
        });
    });
});
describe('purge', function() {
    it('hasOne -- purge should remove itself + clean the other docs', function(done) {
        var name = util.s8();
        var Model = thinky.createModel(name, {
            id: String
        })

        var otherName = util.s8();
        var OtherModel = thinky.createModel(otherName, {
            id: String,
            foreignKey: String
        })

        Model.hasOne(OtherModel, "has", "id", "foreignKey")
        var doc1 = new Model({});

        var otherDoc1 = new OtherModel({});
        var otherDoc2 = new OtherModel({});

        doc1.has = otherDoc1;

        doc1.saveAll().then(function(doc) {
            // Create an extra hasOne link -- which is invalid
            otherDoc2.foreignKey = otherDoc1.foreignKey;
            otherDoc2.save().then(function(doc) {
                doc1.purge().then(function() {
                    Model.run().then(function(result) {
                        assert.equal(result.length, 0);

                        OtherModel.run().then(function(result) {
                            assert.equal(result.length, 2);
                            assert.equal(result[0].foreignKey, undefined);
                            assert.equal(result[1].foreignKey, undefined);
                            done();
                        });
                    });
                });
            });
        }).error(done);
    });
    it('should work with a callback', function(done) {
        var name = util.s8();
        var Model = thinky.createModel(name, {
            id: String
        })

        var otherName = util.s8();
        var OtherModel = thinky.createModel(otherName, {
            id: String,
            foreignKey: String
        })

        Model.hasOne(OtherModel, "has", "id", "foreignKey")
        var doc1 = new Model({});

        var otherDoc1 = new OtherModel({});
        var otherDoc2 = new OtherModel({});

        doc1.has = otherDoc1;

        doc1.saveAll().then(function(doc) {
            // Create an extra hasOne link -- which is invalid
            otherDoc2.foreignKey = otherDoc1.foreignKey;
            otherDoc2.save().then(function(doc) {
                doc1.purge(function() {
                    Model.run().then(function(result) {
                        assert.equal(result.length, 0);

                        OtherModel.run().then(function(result) {
                            assert.equal(result.length, 2);
                            assert.equal(result[0].foreignKey, undefined);
                            assert.equal(result[1].foreignKey, undefined);
                            done();
                        });
                    });
                });
            });
        }).error(done);
    });
    it('belongsTo -- purge should remove itself', function(done) {
        var name = util.s8();
        var Model = thinky.createModel(name, {
            id: String,
            foreignKey: String
        })

        var otherName = util.s8();
        var OtherModel = thinky.createModel(otherName, {
            id: String
        })

        Model.belongsTo(OtherModel, "belongsTo", "foreignKey", "id")

        var doc1 = new Model({});
        var otherDoc1 = new OtherModel({});

        doc1.belongsTo = otherDoc1;

        doc1.saveAll().then(function(doc) {
            doc1.purge().then(function() {
                Model.run().then(function(result) {
                    assert.equal(result.length, 0);

                    OtherModel.run().then(function(result) {
                        assert.equal(result.length, 1);
                        done();
                    });
                });
            });
        }).error(done);
    });
    it('belongsTo not called on its own model -- purge should remove itself + clean the other docs', function(done) {
        var name = util.s8();
        var Model = thinky.createModel(name, {
            id: String
        })

        var otherName = util.s8();
        var OtherModel = thinky.createModel(otherName, {
            id: String,
            foreignKey: String
        })

        OtherModel.belongsTo(Model, "belongsTo", "foreignKey", "id")

        var doc1 = new Model({});
        var otherDoc1 = new OtherModel({});

        otherDoc1.belongsTo = doc1;

        otherDoc1.saveAll().then(function(doc) {
            doc1.purge().then(function() {
                Model.run().then(function(result) {
                    assert.equal(result.length, 0);

                    OtherModel.run().then(function(result) {
                        assert.equal(result.length, 1);
                        assert.equal(result[0].foreignKey, undefined);

                        assert.equal(otherDoc1.foreignKey, undefined);
                        done();
                    });
                });
            });
        }).error(done);
    });

    it('hasMany -- purge should remove itself', function(done) {
        var name = util.s8();
        var Model = thinky.createModel(name, {
            id: String
        })

        var otherName = util.s8();
        var OtherModel = thinky.createModel(otherName, {
            id: String,
            foreignKey: String
        })

        Model.hasMany(OtherModel, "otherDocs", "id", "foreignKey")

        var doc = new Model({});
        var otherDocs = [new OtherModel({}), new OtherModel({}), new OtherModel({})];
        doc.otherDocs = otherDocs;

        doc.saveAll().then(function() {
            var extraDoc = new OtherModel({foreignKey: otherDocs[0].foreignKey});
            extraDoc.save().then(function() {
                doc.purge().then(function() {
                    Model.run().then(function(result) {
                        assert.equal(result.length, 0);
                        OtherModel.run().then(function(result) {
                            assert.equal(result.length, 4);
                            for(var i=0; i<result.length; i++) {
                                assert.equal(result[i].foreignKey, undefined)
                            }
                            done();
                        });
                    })
                });
            });
        }).error(done);
    });
    it('hasAndBelongsToMany -- pk -- purge should clean the database', function(done) {
        var name = util.s8();
        var Model = thinky.createModel(name, {
            id: String
        })

        var otherName = util.s8();
        var OtherModel = thinky.createModel(otherName, {
            id: String
        })

        Model.hasAndBelongsToMany(OtherModel, "otherDocs", "id", "id");

        var doc = new Model({});
        var otherDocs = [new OtherModel({}), new OtherModel({}), new OtherModel({})];
        doc.otherDocs = otherDocs;

        doc.saveAll().then(function(doc) {
            Model.get(doc.id).run().then(function(result) {
                result.purge().then(function() {
                    Model.run().then(function(result) {
                        assert.equal(result.length, 0);
                        OtherModel.run().then(function(result) {
                            assert(result.length, 3);
                            var link = Model._getModel()._joins.otherDocs.link;
                            r.table(link).run().then(function(result) {
                                assert.equal(result.length, 0);
                                done();
                            });
                        });
                    });
                });
            });
        }).error(done);;
    });
    it('hasAndBelongsToMany not called on this model -- pk -- purge should clean the database', function(done) {
        var name = util.s8();
        var Model = thinky.createModel(name, {
            id: String
        })

        var otherName = util.s8();
        var OtherModel = thinky.createModel(otherName, {
            id: String
        })

        Model.hasAndBelongsToMany(OtherModel, "otherDocs", "id", "id");

        var doc = new Model({});
        var otherDocs = [new OtherModel({}), new OtherModel({}), new OtherModel({})];
        doc.otherDocs = otherDocs;

        doc.saveAll().then(function(doc) {
            OtherModel.get(otherDocs[0].id).run().then(function(result) {
                result.purge().then(function() {
                    Model.run().then(function(result) {
                        assert.equal(result.length, 1);
                        OtherModel.run().then(function(result) {
                            assert(result.length, 2);
                            var link = Model._getModel()._joins.otherDocs.link;
                            r.table(link).run().then(function(result) {
                                assert.equal(result.length, 2);
                                done();
                            });
                        });
                    });
                });
            });
        }).error(done);
    });
    it('hasAndBelongsToMany -- not pk -- purge should clean the database', function(done) {
        var name = util.s8();
        var Model = thinky.createModel(name, {
            id: String,
            foo: Number
        })

        var otherName = util.s8();
        var OtherModel = thinky.createModel(otherName, {
            id: String,
            foo: Number
        })

        Model.hasAndBelongsToMany(OtherModel, "otherDocs", "foo", "foo");

        var doc = new Model({foo: 1});
        var otherDocs = [new OtherModel({foo: 2}), new OtherModel({foo: 2}), new OtherModel({foo: 3})];
        doc.otherDocs = otherDocs;

        doc.saveAll().then(function(doc) {
            Model.get(doc.id).run().then(function(result) {
                result.purge().then(function() {
                    Model.run().then(function(result) {
                        assert.equal(result.length, 0);
                        OtherModel.run().then(function(result) {
                            assert(result.length, 3);
                            var link = Model._getModel()._joins.otherDocs.link;
                            r.table(link).run().then(function(result) {
                                assert.equal(result.length, 2);
                                done();
                            });
                        });
                    });
                });
            });
        }).error(done);
    });
    it('hasAndBelongsToMany not called on this model -- not pk -- purge should clean the database', function(done) {
        var name = util.s8();
        var Model = thinky.createModel(name, {
            id: String,
            foo: Number
        })

        var otherName = util.s8();
        var OtherModel = thinky.createModel(otherName, {
            id: String,
            foo: Number
        })

        Model.hasAndBelongsToMany(OtherModel, "otherDocs", "foo", "foo");

        var doc = new Model({foo: 1});
        var otherDocs = [new OtherModel({foo: 2}), new OtherModel({foo: 2}), new OtherModel({foo: 2})];
        doc.otherDocs = otherDocs;

        doc.saveAll().then(function(doc) {
            OtherModel.get(otherDocs[0].id).run().then(function(result) {
                result.purge().then(function() {
                    Model.run().then(function(result) {
                        assert.equal(result.length, 1);
                        OtherModel.run().then(function(result) {
                            assert(result.length, 2);
                            var link = Model._getModel()._joins.otherDocs.link;
                            r.table(link).run().then(function(result) {
                                assert.equal(result.length, 1);
                                done();
                            });
                        });
                    });
                });
            });
        }).error(done);
    });
});
describe('date', function() {
    it('should work', function(done) {
        var name = util.s8();
        var Model = thinky.createModel(name, {
            id: String,
            date: {_type: Date, default: r.now()}
        });
        var doc = new Model({});
        assert.equal(typeof doc.date, 'function')
        doc.save().then(function(result) {
            assert(doc.date instanceof Date);
            Model.get(doc.id).run().then(function(result) {
                assert.deepEqual(result.date, doc.date);
                done();
            });
        }).error(done);;
    });
});

describe('_merge', function() {
    it('should work', function() {
        var name = util.s8();
        var Model = thinky.createModel(name, {
            id: String,
            foo: {
                buzz: Number,
                bar: String
            }
        });
        var doc = new Model({id: "str", foo: {bar: "hello"}});
        doc._merge({foo: {buzz: 2}});
        assert.deepEqual(doc, {foo: {buzz: 2}});
        doc._merge({foo: {bar: "bar", buzz: 2}});
        assert.deepEqual(doc, {foo: {bar: "bar", buzz: 2}});
    });
    it('should return the object', function() {
        var name = util.s8();
        var Model = thinky.createModel(name, {
            id: String,
            foo: {
                buzz: Number,
                bar: String
            }
        });
        var doc = new Model({id: "str", foo: {bar: "hello"}});
        var doc2 = doc._merge({foo: {buzz: 2}});
        assert.strictEqual(doc2, doc);
    });
});
describe('merge', function() {
    it('should work', function() {
        var name = util.s8();
        var Model = thinky.createModel(name, {
            id: String,
            foo: {
                buzz: Number,
                bar: String
            }
        });
        var doc = new Model({id: "str", foo: {bar: "hello"}});
        doc.merge({id: "world", foo: {buzz: 2}});
        assert.deepEqual(doc, {id: "world", foo: {bar: "hello", buzz: 2}});
    });
    it('should return the object', function() {
        var name = util.s8();
        var Model = thinky.createModel(name, {
            id: String,
            foo: {
                buzz: Number,
                bar: String
            }
        });
        var doc = new Model({id: "str", foo: {bar: "hello"}});
        var doc2 = doc.merge({foo: {buzz: 2}});
        assert.strictEqual(doc2, doc);
    });
});
describe('hooks', function() {
    it('init pre', function() {
        var Model = thinky.createModel(util.s8(), {id: String, title: String});
        assert.throws(function() { Model.pre('init', function() {
            this.title = this.id;
        })
        }, function(error) {
            return ((error instanceof Error) && (error.message === 'No pre-hook available for the event `init`.'))
        });
    });
    it('init post sync', function() {
        var Model = thinky.createModel(util.s8(), {id: String, title: String});
        Model.post('init', function() {
            this.title = this.id;
        })

        var doc = new Model({id: "foobar"});
        assert.equal(doc.id, doc.title)
    });
    it('init post sync - error', function() {
        var Model = thinky.createModel(util.s8(), {id: String, title: String});
        Model.post('init', function() {
            throw new Error("Error thrown by a hook")
        })
        Model.post('init', function() {
            this.title = this.id;
        })

        try {
            var doc = new Model({id: "foobar"});
        }
        catch(err) {
            assert.equal(err.message, "Error thrown by a hook");
        }
    });

    it('init post async', function(done) {
        var Model = thinky.createModel(util.s8(), {id: String, title: String});
        Model.post('init', true, function(next) {
            var self = this;
            setTimeout(function() {
                self.title = self.id;
                next();
            }, 100);
        })

        var doc = new Model({id: "foobar"}).then(function() {
            assert.equal(doc.id, doc.title)
            done();
        }).error(done);
    });
    it('init post async - error', function(done) {
        var Model = thinky.createModel(util.s8(), {id: String, title: String});
        Model.post('init', true, function(next) {
            var self = this;
            setTimeout(function() {
                self.title = self.id;
                next(new Error("Async error thrown by a hook"));
            }, 100);
        })

        var doc = new Model({id: "foobar"}).then(function() {
            done(new Error("Expecting error"));
        }).error(function(err) {
            assert.equal(err.message, "Async error thrown by a hook");
            done();
        });
    });

    it('validate oncreate sync', function(done) {
        var Model = thinky.createModel(util.s8(), {id: String, title: String}, {validate: 'oncreate'});
        Model.post('validate', true, function(next) {
            var self = this;
            setTimeout(function() {
                self.title = self.id;
                next();
            }, 100);
        })

        var doc = new Model({id: "foobar"}).then(function() {
            assert.equal(doc.id, doc.title)
            done();
        }).error(done);
    });
    it('validate oncreate + init async', function(done) {
        var Model = thinky.createModel(util.s8(), {id: String, title: String}, {validate: 'oncreate'});
        Model.post('init', true, function(next) {
            var self = this;
            setTimeout(function() {
                self.title2 = self.id;
                next();
            }, 100);
        })
        Model.post('validate', true, function(next) {
            var self = this;
            setTimeout(function() {
                self.title = self.id;
                next();
            }, 100);
        })

        var doc = new Model({id: "foobar"}).then(function() {
            assert.equal(doc.id, doc.title)
            assert.equal(doc.id, doc.title2)
            done();
        }).error(done);
    });

    it('validate post sync', function() {
        var Model = thinky.createModel(util.s8(), {id: String, title: String});
        Model.post('validate', function() {
            this.title = this.id;
        })

        var doc = new Model({id: "foobar"});
        doc.validate();
        assert.equal(doc.id, doc.title)
    });
    it('validate post sync - error', function() {
        var Model = thinky.createModel(util.s8(), {id: String, title: String});
        Model.post('validate', function() {
            throw new Error("Error thrown by a hook")
        })

        var doc = new Model({id: "foobar"});
        try {
            doc.validate();
        }
        catch(err) {
            assert.equal(err.message, "Error thrown by a hook");
        }
    });

    it('init validate async', function(done) {
        var Model = thinky.createModel(util.s8(), {id: String, title: String});
        Model.post('validate', true, function(next) {
            var self = this;
            setTimeout(function() {
                self.title = self.id;
                next();
            }, 100);
        })

        var doc = new Model({id: "foobar"});
        doc.validate().then(function() {
            assert.equal(doc.id, doc.title)
            done();
        }).error(done);
    });
    it('init post async - error', function(done) {
        var Model = thinky.createModel(util.s8(), {id: String, title: String});
        Model.post('validate', true, function(next) {
            var self = this;
            setTimeout(function() {
                self.title = self.id;
                next(new Error("Async error thrown by a hook"));
            }, 100);
        })

        var doc = new Model({id: "foobar"});
        doc.validate().then(function() {
            done(new Error("Expecting error"));
        }).error(function(err) {
            assert.equal(err.message, "Async error thrown by a hook");
            done();
        });
    });
    it('init validateAll async', function(done) {
        var Model = thinky.createModel(util.s8(), {id: String, title: String});
        Model.post('validate', true, function(next) {
            var self = this;
            setTimeout(function() {
                self.title = self.id;
                next();
            }, 100);
        })

        var doc = new Model({id: "foobar"});
        doc.validateAll().then(function() {
            assert.equal(doc.id, doc.title)
            done();
        }).error(done);
    });
    it('init validateAll async joins', function(done) {
        var Model = thinky.createModel(util.s8(), {id: String, title: String});
        var OtherModel = thinky.createModel(util.s8(), {id: String, foreignKey: String});
        Model.hasOne(OtherModel, 'other', 'id', 'foreignKey');

        OtherModel.post('validate', true, function(next) {
            var self = this;
            setTimeout(function() {
                self.title = self.id;
                next();
            }, 100);
        })

        var doc = new Model({id: "foo"});
        var otherDoc = new OtherModel({id: "bar"});
        doc.other = otherDoc;

        doc.validateAll().then(function() {
            assert.equal(otherDoc.id, otherDoc.title)
            done();
        }).error(done);
    });
    it('validate on save', function(done) {
        var Model = thinky.createModel(util.s8(), {id: String, title: String});

        Model.post('validate', true, function(next) {
            var self = this;
            setTimeout(function() {
                self.title = self.id;
                next();
            }, 100);
        })

        var doc = new Model({id: "foo"});
        doc.save().then(function(result) {
            assert.strictEqual(result, doc)
            Model.get("foo").run().then(function(result) {
                assert.equal(result.id, result.title)
                done();
            })
        }).error(done);
    });
    it('validate on retrieve - error on validate', function(done) {
        var Model = thinky.createModel(util.s8(), {id: String, title: String});

        Model.pre('validate', true, function(next) {
            var self = this;
            setTimeout(function() {
                self.title = self.id;
                next();
            }, 100);
        })

        Model.once('ready', function() {
            r.table(Model.getTableName()).insert({id: 1}).run().then(function(result) {
                Model.get(1).run().then(function(result) {
                    done(new Error("Was expecting an error"))
                }).error(function(err) {
                    assert.equal(err.message, "Value for [id] must be a string or null.");
                    done();
                });
            }).error(done);
        });
    });
    it('validate on retrieve - error on hook', function(done) {
        var Model = thinky.createModel(util.s8(), {id: String, title: String});

        Model.pre('validate', true, function(next) {
            var self = this;
            setTimeout(function() {
                self.title = self.id;
                next(new Error("I'm Hook, and I'm a vilain"));
            }, 100);
        })

        Model.once('ready', function() {
            r.table(Model.getTableName()).insert({id: 1}).run().then(function(result) {
                Model.get(1).run().then(function(result) {
                    done(new Error("Was expecting an error"))
                }).error(function(err) {
                    assert.equal(err.message, "I'm Hook, and I'm a vilain");
                    done();
                });
            }).error(done);
        });
    });
    it('save pre', function(done) {
        var Model = thinky.createModel(util.s8(), {id: String, title: String});

        Model.pre('save', true, function(next) {
            var self = this;
            setTimeout(function() {
                self.title = self.id;
                next();
            }, 100);
        })

        var doc = new Model({id: "foo"});
        doc.save().then(function(result) {
            assert.strictEqual(result, doc)
            assert.equal(doc.id, doc.title);
            r.table(Model.getTableName()).get(doc.id).run().then(function(result) {
                assert.equal(result.id, result.title);
                done();
            });
        }).error(done);
    });
    it('save post', function(done) {
        var Model = thinky.createModel(util.s8(), {id: String, title: String});

        Model.post('save', true, function(next) {
            var self = this;
            setTimeout(function() {
                self.title = self.id;
                next();
            }, 100);
        })

        var doc = new Model({id: "foo"});
        doc.save().then(function(result) {
            assert.strictEqual(result, doc)
            assert.equal(doc.id, doc.title);
            r.table(Model.getTableName()).get(doc.id).run().then(function(result) {
                assert.equal(result.title, undefined);
                done();
            });
        }).error(done);
    });
    it('save pre join', function(done) {
        var Model = thinky.createModel(util.s8(), {id: String, title: String});
        var OtherModel = thinky.createModel(util.s8(), {id: String, foreignKey: String});
        Model.hasOne(OtherModel, 'other', 'id', 'foreignKey');

        OtherModel.pre('save', true, function(next) {
            var self = this;
            setTimeout(function() {
                self.title = self.id;
                next();
            }, 100);
        })

        var doc = new Model({id: "foo"});
        var otherDoc = new OtherModel({id: "bar"});
        doc.other = otherDoc;

        doc.saveAll().then(function(result) {
            assert.equal(otherDoc.id, otherDoc.title)
            done();
        }).error(done);
    });
    it('save pre join', function(done) {
        var Model = thinky.createModel(util.s8(), {id: String, title: String});
        var OtherModel = thinky.createModel(util.s8(), {id: String, foreignKey: String});
        Model.hasOne(OtherModel, 'other', 'id', 'foreignKey');

        OtherModel.pre('save', true, function(next) {
            var self = this;
            setTimeout(function() {
                self.title = self.id;
                next();
            }, 100);
        })

        var doc = new Model({id: "foo"});
        var otherDoc = new OtherModel({id: "bar"});
        doc.other = otherDoc;

        doc.saveAll().then(function(result) {
            assert.equal(otherDoc.id, otherDoc.title)
            done();
        }).error(done);
    });
    it('delete pre', function(done) {
        var Model = thinky.createModel(util.s8(), {id: String, title: String});

        Model.pre('delete', true, function(next) {
            var self = this;
            setTimeout(function() {
                self.title = self.id;
                next();
            }, 100);
        })

        var doc = new Model({id: "foo"});
        doc.save().then(function(result) {
            assert.strictEqual(result, doc)

            doc.delete().then(function(result) {
                assert.strictEqual(result, doc)
                assert.equal(doc.id, doc.title);
                done();
            }).error(done);
        }).error(done);
    });
    it('delete post', function(done) {
        var Model = thinky.createModel(util.s8(), {id: String, title: String});

        Model.post('delete', true, function(next) {
            var self = this;
            setTimeout(function() {
                self.title = self.id;
                next();
            }, 100);
        })

        var doc = new Model({id: "foo"});
        doc.save().then(function(result) {
            assert.strictEqual(result, doc)

            doc.delete().then(function(result) {
                assert.strictEqual(result, doc)
                assert.equal(doc.id, doc.title);
                done();
            }).error(done);
        }).error(done);
    });
    it('hook for retrieve', function(done) {
        var Model = thinky.createModel(util.s8(), {id: String, title: String});

        Model.post('retrieve', true, function(next) {
            var self = this;
            setTimeout(function() {
                self.title = self.id;
                next();
            }, 100);
        })

        Model.once('ready', function() {
            var id = util.s8();
            r.table(Model.getTableName()).insert({id: id}).run().then(function(result) {
                Model.get(id).run().then(function(result) {
                    assert.equal(result.title, result.id);
                    done();
                }).error(done);
            }).error(done);
        });
    });
});
