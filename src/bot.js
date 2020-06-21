#!/usr/bin/env node

var Discord = require('discord.js');
var logger = require('winston');
var auth = require('./auth.json');
var User = require("./user.js")
const MongoClient = require('mongodb').MongoClient;
const roles = ["F2P", "Normal League", "Sadistic League", "Evil League", "Whales League", "Unranked"];
const roles_levels = [100, 2000, 3000, 4000, 5001];

const uri = auth.mongoConnectionString;
const mongo = new MongoClient(uri, {
    useNewUrlParser: true
});
var rolls;
mongo.connect(err => {
    rolls = mongo.db("user_data").collection("rolls");
});

var seasons;
var current_season;
mongo.connect(err => {
    seasons = mongo.db("user_data").collection("seasons");
    seasons.findOne({
        "number": 1
    }, (error, result) => {
        if (error) throw error;

        if (!result)
            seasons.insertOne({
                "number": 1,
                "best_roll": -1,
                "best_average": -1
            }, (err, res) => {
                if (err) throw err;
                current_season = res
            });
        else
            current_season = result;
    })
});


// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';

const client = new Discord.Client();
token = auth.token;
client.login(token)

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', handleMessage);

function rollElo(user, evt) {
    rolls.findOne({
        "userid": user.id
    }, (err, result) => {
        if (err) throw err;

        var userRes;
        if (!result) {
            userRes = new User(user.id, user.username);
        } else {
            userRes = result;
        }

        var reply;

        var midnight = new Date();
        midnight.setHours(0, 0, 0, 0);
        //if (userRes.lastRoll >= midnight) {
        if (userRes.lastRoll >= (new Date()).setSeconds(0, 0)) {
            var getout = client.emojis.cache.find(emoji => emoji.name === "getout");
            reply = `you already had your roll today. ${getout}`;
        } else {
            var rollres = roll();

            var reply = rollres.toString();
            if (userRes._id === null) {
                userrolls = [rollres];
                var u = {
                    rolls: userrolls,
                    userid: user.id,
                    username: user.username,
                    lastRoll: new Date()
                };
                rolls.insertOne(insert, (err, res) => {
                    if (err) throw err;
                    console.log("saved one value")
                    updateSeason(rollres, [rollres], u);
                });
            } else {
                userRes.rolls.push(rollres);
                var query = {
                    _id: userRes._id
                };
                var values = {
                    $push: {
                        rolls: rollres
                    },
                    $set: {
                        lastRoll: new Date()
                    }
                };

                rolls.updateOne(query, values, (err, res) => {
                    if (err) throw err;
                    console.log("saved one value")
                    updateSeason(rollres, userRes.rolls, userRes);
                });
            }

            //Deal with roles
            for (var i = 0; i < roles.length; i++) {
                var role = roles[i];
                var ro = evt.guild.roles.cache.find(r => r.name === role);
                if (evt.member.roles.cache.find(r => r.name === role));
                evt.member.roles.remove(ro.id);
            };

            var roleName = null;
            var i = 0;
            while (roleName === null) {
                if (rollres < roles_levels[i])
                    roleName = roles[i];
            }
            var role = evt.guild.roles.cache.find(role => role.name === roleName);
            evt.member.roles.add(role);
        }

        evt.reply(reply);
    });
}

function updateSeason(rollres, rolls, user) {
    var newCurrentSeason = {
        "number": current_season.number
    };

    if (rollres > current_season.best_roll) {
        newCurrentSeason.best_roll = rollres;
        newCurrentSeason.best_roller = user;
    }
    avg = average(rolls);
    if (avg > current_season.best_average) {
        newCurrentSeason.best_average = avg;
        newCurrentSeason.best_averager = user;
    }

    current_season = newCurrentSeason;
    seasons.updateOne({
        "number": newCurrentSeason.number
    }, {
        $set: newCurrentSeason
    }, (err, res) => {
        if (err) throw err;
    });
}

function roll() {
    var res = Math.round(Math.random() * 5000 + 1);

    return res;
}

function calcaverage(user, evt) {
    rolls.findOne({
        "userid": user.id
    }, (err, result) => {
        if (err) throw err;

        var userRes;
        if (!result) {
            userRes = new User(user.id, user.username);
        } else {
            userRes = result;
        }

        var avg = average(userRes.rolls);

        evt.reply("your average is " + avg.toString());
    });
}

function average(data) {
    var avg = 0;

    if (data.length) {
        for (var i = 0; i < data.length; i++)
            avg += data[i];
        avg /= data.length;
    }

    return avg;
}

function lastRoll(user, evt) {
    rolls.findOne({
        "userid": user.id
    }, (err, result) => {
        if (err) throw err;

        if (!result) {
            evt.reply("you haven't rolled yet. Use the command =roll to start playing.");
            return;
        } else {
            evt.reply("your last roll was " + result.rolls[result.rolls.length - 1].toString());
        }

    });
}

function findtop(user, evt) {
    rolls.findOne({
        "userid": user.id
    }, (err, result) => {
        if (err) throw err;

        if (!result) {
            evt.reply("you haven't rolled yet. Use the command =roll to start playing.");
            return;
        } else {
            evt.reply("your top roll was " + Math.max(result.rolls).toString());
        }

    });
}

function helpMessage() {
    return "```=Help: Shows all of HONGUELO's commands. Looking at that right now!\n" +
        "=Roll: Rolls for your ELO if you haven't done so today\n" +
        "=Practice: Do a practice roll\n" +
        "=Last: Shows your last roll\n" +
        "=Leagues: Displays the leagues, and how to get them\n" +
        "=Average: Shows your roll averages for the season so far\n" +
        "=Top: Displays your highest roll for the season so far\n" +
        "=Countdown: Displays time until next roll reset\n" +
        "=Best: Shows the best roll for the season and the best average for the season```";
}

function leaguesMessage() {
    return "```fix\n" +
        "Official ELO Leagues Requirements:```" +
        "1-99: F2P\n" +
        "100-1999: Normal\n" +
        "2000-3999: Evil\n" +
        "4000-4900: Sadistic\n" +
        "4901-5000: Whales";
}

function countdown() {
    var next = new Date();
    next.setHours(0, 0, 0, 0);
    next.setDate(next.getDate() + 1);
    var diff = new Date(next - new Date());
    return "next roll avaible in " + diff.getHours() + " hours, " + diff.getMinutes() + " minutes, " + diff.getSeconds() + " seconds."
}

function best() {
    return "the best roll for this season is `" + current_season.best_roll + "` from `" + current_season.best_roller.username + "`.\n" +
        "the best average for this season is `" + current_season.best_average + "` from `" + current_season.best_averager.username + "`.";
}

function handleMessage(evt) {
    message = evt.content;
    /* Break the comment in case of DUNAK
    evt.react(evt.guild.emojis.cache.find(emoji => emoji.name === "pog"))
    .then(console.log)
    .catch(console.error);*/
    if (message.substring(0, 1) == '=') {
        var args = message.toLowerCase().substring(1).split(' ');
        var cmd = args[0];
        args = args.splice(1);
        switch (cmd) {
            // =ping
            case 'ping':
                evt.reply('Pong!');
                break;
                // =roll
            case 'roll':
                rollElo(evt.author, evt);
                break;
                // =practice
            case 'practice':
                evt.reply(roll());
                break;
                // =help
            case 'help':
                evt.reply(helpMessage());
                break;
                // =leagues
            case 'leagues':
                evt.reply(leaguesMessage());
                break;
                // =average
            case 'average':
                calcaverage(evt.author, evt);
                break;
                // =last
            case 'last':
                lastRoll(evt.author, evt);
                break;
                // =top
            case 'top':
                findtop(evt.author, evt);
                break;
                // =countdown
            case 'countdown':
                evt.reply(countdown());
                break;
                // =best
            case 'best':
                evt.reply(best());
                break;
        }
    }
}