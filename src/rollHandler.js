const eloRoles = require('./eloRoles.json');
const userRepo = require('./userRepo.js');
const discordHandler = require('./discordHandler');
var User = require("./user.js");


module.exports.userCanRoll = userCanRoll;
module.exports.evtRoll = doRoll;
module.exports.roll = roll;

function userCanRoll(user) {
    if(user.lastRoll === null) return true;

    var midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    return (user.lastRoll < midnight);
}

async function doRoll(evt) {

    let rollres = roll();
    let reply = await updateRoll(rollres, evt.author.id, evt.author.username);

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

async function updateRoll(rollres, userId, username) {
    console.log("Rolling for " + username);

    var user = await userRepo.findUserById(userId);
    if (!user) {
        user = new User(userId, username);
    }

    if (!userCanRoll(user)) {
        return null;
    } else {
        user.rolls.push(rollres);
        user.best_roll = user.best_roll > rollres ? user.best_roll : rollres;
        user.average = score(user.rolls);

        userRepo.upsertOne(user);
    }

    return rollres.toString();
}

function roll() {
    var res = Math.round(Math.random() * 5000 + 1);

    return res;
}

function score(data) {
    var avg = 0;
    var seasonLengt = 30;

    if (data.length) {
        for (var i = 0; i < data.length; i++)
            avg += data[i]/seasonLengt;
    }

    return avg;
}