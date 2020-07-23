var auth = require('./resources/auth.json');
const MongoClient = require('mongodb').MongoClient;

const uri = auth.mongoConnectionString;
const mongo = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
var rolls = null;
mongo.connect(err => {
    rolls = mongo.db("user_data");
});

module.exports.findAllOrderByBestRoll = async function findAllOrderByBestRoll(reverse, season) {
    if (rolls === null || rolls.collection("rolls" + season) === null) return null;
    if (reverse === null) reverse = false;

    var cursor;
    if (reverse) {
        cursor = await rolls.collection("rolls" + season).find({}, {
            projection: {
                _id: 0,
                username: 1,
                worse_roll: 1,
                best_roll: 1,
                userid: 1
            },
            sort: {
                worse_roll: reverse ? 1 : -1
            }
        });
    } else {
        cursor = await rolls.collection("rolls" + season).find({}, {
            projection: {
                _id: 0,
                username: 1,
                best_roll: 1,
                worse_roll: 1,
                userid: 1
            },
            sort: {
                best_roll: reverse ? 1 : -1
            }
        });
    }

    return cursor.toArray();
}

module.exports.findAllOrderByAvg = async function findAllOrderByAvg(reverse, season) {
    if (rolls === null || rolls.collection("rolls" + season) === null) return null;
    if (reverse === null) reverse = false;

    return rolls.collection("rolls" + season).find({}, {
        projection: {
            _id: 0,
            username: 1,
            average: 1,
            userid: 1
        }
    }).sort({
        average: reverse ? 1 : -1
    }).toArray();
}

module.exports.findUserById = async function findAllById(id, season) {
    return rolls.collection("rolls" + season).findOne({
        "userid": id
    });
}

module.exports.upsertOne = async function upsertOne(user, season) {
    var query = {
        userid: user.userid
    };
    var values = {
        $set: {
            lastRoll: new Date(),
            username: user.username,
            rolls: user.rolls,
            average: user.average,
            best_roll: user.best_roll,
            worse_roll: user.worse_roll
        }
    };

    rolls.collection("rolls" + season).updateOne(query, values, {
        upsert: true
    });
}