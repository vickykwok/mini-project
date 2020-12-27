const express = require('express');
const app = express();
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const assert = require('assert');
const fs = require('fs');
const formidable = require('express-formidable');
const mongourl = 'mongodb+srv://vickykwok:vickykwok@cluster0.o5cyu.mongodb.net/test?retryWrites=true&w=majority';
const dbName = 'test';

app.use(formidable());
app.set('view engine', 'ejs');

// start with the login page
const SECRETKEY = 'I want to pass COMPS381F';

const users = new Array(
	{name: 'demo', password: ''},
	{name: 'student', password: ''}
);

app.set('view engine','ejs');

app.use(session({
  name: 'loginSession',
  keys: [SECRETKEY]
}));


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req,res) => {
	console.log(req.session);
	if (!req.session.authenticated) {
		res.redirect('/login');
	} else {
		res.status(200).render('secrets',{name:req.session.username});
	}
});

app.get('/login', (req,res) => {
	res.status(200).render('login',{});
});

app.post('/login', (req,res) => {
	users.forEach((user) => {
		if (user.name == req.body.name && user.password == req.body.password) {
			req.session.authenticated = true;        // 'authenticated': true
			req.session.username = req.body.name;	 // 'username': req.body.name		
		}
	});
	res.redirect('/find');
});

app.get('/logout', (req,res) => {
	req.session = null;   // clear cookie-session
	res.redirect('/');
});

//create new restuarant information
const insertDocument = (db, doc, res, callback) => {
    db.collection('restaurant').
    insertOne(doc, (err, results) => {//
        assert.equal(err,null);
        console.log("inserted one document " + JSON.stringify(doc)); 
        callback(results);
    }); 
}

const handle_Insert = (req, res, criteria) => {
    var DOCID = {};
    DOCID['_id'] = ObjectID(req.fields._id);
    var insertDoc = {};
    insertDoc['restaurant_id'] = req.fields.restaurant_id;
    insertDoc['name'] = req.fields.name;
    insertDoc['borough'] = req.fields.borough;
    insertDoc['cuisine'] = req.fields.cuisine;
    insertDoc['photo'] = req.fields.photo;
    insertDoc['photo_mimetype'] = req.fields.photo_mimetype;
    insertDoc['gps'] = [req.fields.lat,req.fields.lon];
    insertDoc['grades'] = req.fields.grades;
    insertDoc['owner'] = req.fields.owner;
    insertDoc['address'] = [req.fields.street,req.fields.building];
    if (req.files.filetoupload.size > 0) {
        fs.readFile(req.files.filetoupload.path, (err,data) => {
            assert.equal(err,null);
            insertDoc['photo'] = new Buffer.from(data).toString('base64');
            insertDocument(DOCID, insertDoc, (results) => {
                res.status(200).render('insert', {})
            });
        });
    } else {
        insertDocument(DOCID, insertDoc, (results) => {
            res.status(200).render('insert', {})
        });
    }

}

const findDocument = (db, criteria, callback) => {
    let cursor = db.collection('restaurant').find(criteria);
    console.log(`findDocument: ${JSON.stringify(criteria)}`);
    cursor.toArray((err,docs) => {
        assert.equal(err,null);
        console.log(`findDocument: ${docs.length}`);
        callback(docs);
    });
}

const handle_Find = (res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        findDocument(db, criteria, (docs) => {
            client.close();
            console.log("Closed DB connection");
            res.status(200).render('find',{nrestaurant: docs.length, restaurant: docs,restaurant_id:docs['restaurant_id']});

        });
    });
}
// /create
const handle_Details = (res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        /* use Document ID for query */
        let DOCID = {};
        DOCID['_id'] = ObjectID(criteria._id)
        findDocument(db, DOCID, (docs) => {  
            client.close();
            console.log("Closed DB connection");
            res.status(200).render('details', {restaurant_id:docs['restaurant_id']});
        });
    });
}
// /remove
const handle_Delete = (res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        let DOCID = {};
        DOCID['_id'] = ObjectID(criteria._id)
        db.collection('restaurant').deleteMany(criteria,(err,results) => {
            assert.equal(err,null)
            client.close()
            res.status(200).render('delete', {});
        })
    });
}


const handle_Rate = (res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        let DOCID = {};
        DOCID['_id'] = ObjectID(criteria._id)
        db.collection('restaurant').updateDocument(DOCID, updateDoc, (results) => {
            res.status(200).render('rate', {restaurant_id:docs['restaurant_id']});

        });
    });
}

const updateDocument = (criteria, updateDoc, callback) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

         db.collection('restaurant').updateOne(criteria,
            {
                $set : updateDoc
            },
            (err, results) => {
                client.close();
                assert.equal(err, null);
                callback(results);
            }
        );
    });
}
// /change
const handle_Update = (req, res, criteria) => {
        var DOCID = {};
        DOCID['_id'] = ObjectID(req.fields._id);
        var updateDoc = {};
        updateDoc['restaurant_id'] = req.fields.restaurant_id;
        updateDoc['name'] = req.fields.name;
        updateDoc['borough'] = req.fields.borough;
        updateDoc['cuisine'] = req.fields.cuisine;
        updateDoc['photo'] = req.fields.photo;//??photo is field?
        updateDoc['photo_mimetype'] = req.fields.photo_mimetype;
        updateDoc['gps'] = [req.fields.lat,req.fields.lon];
        updateDoc['grades'] = req.fields.grades;
        updateDoc['owner'] = req.fields.owner;
        updateDoc['address'] = [req.fields.street,req.fields.building];
        if (req.files.filetoupload.size > 0) {
            fs.readFile(req.files.filetoupload.path, (err,data) => {
                assert.equal(err,null);
                updateDoc['photo'] = new Buffer.from(data).toString('base64');
                updateDocument(DOCID, updateDoc, (results) => {
                    res.status(200).render('update', {})
                });
            });
        } else {
            updateDocument(DOCID, updateDoc, (results) => {
                res.status(200).render('update', {restaurant_id:updateDoc['restaurant_id']})

            });
        }

}

app.get('/insert', (req,res) => {
    handle_Insert(res, req.query);
})
app.get('/find', (req,res) => {
    handle_Find(res, req.query.docs);
})
app.get('/details', (req,res) => {
    handle_Details(res, req.query);
})
app.get('/delete', (req,res) => {
    handle_Delete(res, req.query);
})
app.get('/rate', (req,res) => {
    handle_Rate(res, req.query);
})
app.post('/update', (req,res) => {
    handle_Update(req, res, req.query);
})

app.get("/map", (req,res) => {
	res.render("leaflet.ejs", {
		lat:req.query.lat,
		lon:req.query.lon,
		zoom:req.query.zoom ? req.query.zoom : 15
	});
	res.end();
});

/* READ-get get the particular document 
curl -X GET http://localhost:8099/api/booking/BK001
*/
app.get('/api/restaurant/:restaurant_id', (req,res) => {
    if (req.params.restaurant_id) {
        let criteria = {};
        criteria['restaurant_id'] = req.params.restaurant_id;
        const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);

            findDocument(db, criteria, (docs) => {//reuse the find document function
                client.close();
                console.log("Closed DB connection");
                res.status(200).json(docs);
            });
        });
    } else {
        res.status(500).json({"error": "missing restaurant_id"});
    }
})


app.get('/*', (req,res) => {
    //res.status(404).send(`${req.path} - Unknown request!`);
    res.status(404).render('info', {message: `${req.path} - Unknown request!` });
})

app.listen(app.listen(process.env.PORT || 8099));
