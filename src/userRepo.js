var auth = require('./resources/auth.json');
const MongoClient = require('mongodb').MongoClient;

const uri = auth.mongoConnectionString;
const mongo = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
var rolls = null;
mongo.connect(err => {
    rolls = mongo.db("user_data").collection("rolls");
});

module.exports.findAllOrderByBestRoll = async function findAllOrderByBestRoll(reverse) {
    if (rolls === null) return null;
    if (reverse === null) reverse = false;

    var cursor;
    if (reverse) {
        cursor = await rolls.find({}, {
            projection: {
                _id: 0,
                username: 1,
                worse_roll: 1,
                userid: 1
            },
            sort: {
                worse_roll: reverse ? 1 : -1
            }
        });
    } else {
        cursor = await rolls.find({}, {
            projection: {
                _id: 0,
                username: 1,
                best_roll: 1,
                userid: 1
            },
            sort: {
                best_roll: reverse ? 1 : -1
            }
        });
    }

    return cursor.toArray();
}

module.exports.findAllOrderByAvg = async function findAllOrderByAvg(reverse) {
    if (rolls === null) return null;
    if (reverse === null) reverse = false;

    return rolls.find({}, {
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

module.exports.findUserById = async function findAllById(id) {
    return rolls.findOne({
        "userid": id
    });
}

module.exports.upsertOne = async function upsertOne(user) {
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

    rolls.updateOne(query, values, {
        upsert: true
    });
}