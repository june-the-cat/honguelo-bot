const eloRoles = require('./resources/eloRoles.json');
const userRepo = require('./userRepo.js');
const discordHandler = require('./discordHandler');
const seasonInfo = require('./resources/season.json');
var User = require("./user.js");

var currentSeason;
for (var i = 0; i < seasonInfo.length; i++) {
    if (new Date(seasonInfo[i].startDate).getTime() < (new Date()).getTime() &&
        new Date(seasonInfo[i].endDate).getTime() > (new Date()).getTime())
        currentSeason = seasonInfo[i];
}

module.exports.userCanRoll = userCanRoll;
module.exports.evtRoll = doRoll;
module.exports.roll = roll;
module.exports.userRollComparator = userRollComparator;
module.exports.userScoreComparator = userScoreComparator;



function userRollComparator(season) {
    switch (season) {
        case 1:
            return function (a, b) {
                return b.best_roll - a.best_roll;
            };
        case 2:
            return function (a, b) {
                return a.best_roll - b.best_roll;
            };
    }
}

function rollComparator(season) {
    switch (season) {
        case 1:
            return function (a, b) {
                return b - a;
            };
        case 2:
            return function (a, b) {
                return a - b;
            };
    }
}

function userScoreComparator(season) {
    switch (season) {
        case 1:
        case 2:
            return function (a, b) {
                return b.average - a.average;
            };
    }
}

function scoreComparator(season) {
    switch (season) {
        case 1:
        case 2:
            return function (a, b) {
                return b - a;
            };
    }
}

function userCanRoll(user) {
    if (user.lastRoll === null) return true;

    var midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    return (user.lastRoll < midnight);
}

async function doRoll(evt, season) {

    let rollres = roll();
    let reply = await updateRoll(rollres, evt.author.id, evt.author.username, season);

    if (reply === null) {
        var getout = discordHandler.getEmoji("getout");
        reply = `you already had your roll today. ${getout}`;
    } else {
        var roleName = null;
        var i = 0;
        //find which role to give based on the roll
        while (roleName === null) {
            if (rollres < eloRoles[i].topBound)
                roleName = eloRoles[i].name;
            i++;
        }

        discordHandler.clearRoles(evt.guild, evt.member);
        discordHandler.giveRole(roleName, evt.guild, evt.member);
    }

    evt.reply(reply);
}

async function updateRoll(rollres, userId, username, season) {
    console.log("Rolling for " + username);

    var user = await userRepo.findUserById(userId, season);
    if (!user) {
        user = new User(userId, username);
        user.best_roll = rollres;
        user.worse_roll = rollres;
    }

    if (!userCanRoll(user)) {
        return null;
    } else {
        compare = rollComparator(season);
        user.rolls.push(rollres);
        user.best_roll = compare(user.best_roll, rollres) < 0 ? user.best_roll : rollres;
        user.worse_roll = compare(user.worse_roll, rollres) > 0 ? user.worse_roll : rollres;
        user.average = score(user.rolls, season);

        userRepo.upsertOne(user, season);
    }

    return rollres.toString();
}

function roll() {
    var res = Math.round(Math.random() * 5000 + 1);

    return res;
}

function score(data, season) {
    var avg = 0;
    var seasonLengt = Math.floor((new Date(currentSeason.endDate) - new Date(currentSeason.startDate)) / 1000 / 60 / 60 / 24);

    switch (season) {
        case 1:
            if (data.length) {
                for (var i = 0; i < data.length; i++)
                    avg += data[i];
            }
            return avg / 30;
        case 2:
            if (data.length) {
                for (var i = 0; i < data.length; i++)
                    avg += 5000 - data[i] ;
            }
            return avg / seasonLengt;
    }
}