#!/usr/bin/env node

var Discord = require('discord.js');
var logger = require('winston');
var schedule = require('node-schedule');
var auth = require('./auth.json');
var User = require("./user.js");
const package = require('../package.json');
const userRepo = require('./userRepo.js')

const roles = ["F2P", "Normal League", "Evil League", "Sadistic League", "Whales League"];
const roles_levels = [100, 2000, 4000, 4901, 5001];


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

var midnightPost = schedule.scheduleJob('0 0 0 * * *', async function () {
    let rollsByBest = await userRepo.findAllOrderByBestRoll();
    if (rollsByBest === null) return;

    var msg = "```It is currently midnight.\n" +
        "The best roll so far is " + rollsByBest[0].best_roll + " from " + rollsByBest[0].username + ".\n";

    let rollsByAvg = await userRepo.findAllOrderByAvg();
    if (rollsByAvg === null) return;

    var tot = 10;
    if (rollsByAvg.length < tot)
        tot = rollsByAvg.length;
    msg += "The top " + tot + " averages are: ";

    for (var i = 0; i < tot; i++) {
        msg += "\n" + (i + 1) + " - " + rollsByAvg[i].username + ": " + rollsByAvg[i].average + "";
    }

    msg += "\n\nYou can now roll again.```";
    client.channels.cache.get('723818579845185536').send(msg);
});

async function rollElo(u, evt) {
    console.log("Rolling for " + u.username);

    var user = await userRepo.findUserById(u.id);
    if (!user) {
        user = new User(u.id, u.username);
    }
    var reply;

    if (!userCanRoll(user)) {
        var getout = client.emojis.cache.find(emoji => emoji.name === "getout");
        reply = `you already had your roll today. ${getout}`;
    } else {
        var rollres = roll();
        reply = rollres.toString();
        user.rolls.push(rollres);
        user.best_roll = user.best_roll > rollres ? user.best_roll : rollres;
        user.average = average(user.rolls);

        userRepo.upsertOne(user);

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
            i++;
        }
        var role = evt.guild.roles.cache.find(role => role.name === roleName);
        evt.member.roles.add(role);
    }

    evt.reply(reply);
}

function roll() {
    var res = Math.round(Math.random() * 5000 + 1);

    return res;
}

async function calcaverage(user, evt) {
    var userRes = await userRepo.findUserById(user.id);
    if (!userRes) {
        userRes = new User(user.id, user.username);
    }

    if (userRes.rolls.length === 0) {
        evt.reply("you have not rolled yet");
    } else {
        var avg = userRes.average;
        evt.reply("your average is " + avg.toString());
    }
}

function average(data) {
    var avg = 0;

    if (data.length) {
        for (var i = 0; i < data.length; i++)
            avg += data[i];
        avg /= data.length;
    }

    //Round to 2 decimal places
    avg = Math.round(avg * 100) / 100

    return avg;
}

async function lastRoll(user, evt) {
    var result = await userRepo.findUserById(user.id);
    if (!result) {
        evt.reply("you haven't rolled yet. Use the command =roll to start playing.");
        return;
    } else {
        evt.reply("your last roll was " + result.rolls[result.rolls.length - 1].toString());
    }
}

async function findtop(user, evt) {
    var result = await userRepo.findUserById(user.id);

    if (!result) {
        evt.reply("you haven't rolled yet. Use the command =roll to start playing.");
        return;
    } else {
        evt.reply("your top roll was " + Math.max(...result.rolls).toString());
    }
}

function helpMessage() {
    return "```=Help: Shows all of HONGUELO's commands. Looking at that right now!\n" +
        "=Roll: Rolls for your ELO if you haven't done so today\n" +
        "=Practice: Do a practice roll\n" +
        "=Last: Shows your last roll\n" +
        "=Leagues: Displays the leagues, and how to get them\n" +
        "=Average: Shows your roll averages for the season so far\n" +
        "=Top: Displays your highest roll for the season so far\n" +
        "=Countdown: Displays time until your next roll\n" +
        "=Best: Shows the best roll for the season and the best average for the season\n" +
        "=Rank: Shows your rank compared to everyone else's" +
        "=Counter: Shows the number of rolls you made```";
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

async function countdown(user, evt) {
    var result = await userRepo.findUserById(user.id);
    if (!userCanRoll(result)) {
        var next = new Date();
        next.setHours(0, 0, 0, 0);
        next.setDate(next.getDate() + 1);
        var diffInSec = Math.floor((next - new Date()) / (1000));
        var diffInMinutes = Math.floor(diffInSec / 60);
        var diffInHours = Math.floor(diffInMinutes / 60);
        return evt.reply("next roll available in " + diffInHours + " hours, " + (diffInMinutes - diffInHours * 60) + " minutes, " + (diffInSec - diffInMinutes * 60) + " seconds.")
    } else {
        return evt.reply("you can roll now.")
    }
}

function userCanRoll(user) {
    if(user === null) return false; 

    var midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    return (user.lastRoll < midnight);
}

async function best(evt) {
    var bestRolls = await userRepo.findAllOrderByBestRoll();

    if (bestRolls === null || bestRolls.size === 0) {
        evt.reply("there have been no rolls this season so far");
        return;
    }

    var msg = "the best roll for this season is `" + bestRolls[0].best_roll + "` from `" + bestRolls[0].username + "`.\n"

    var bestAvg = await userRepo.findAllOrderByAvg();

    msg += "The best average for this season is `" + bestAvg[0].average.toFixed(2) + "` from `" + bestAvg[0].username + "`.";

    evt.reply(msg);
}

async function rank(evt) {
    var bestAvg = await userRepo.findAllOrderByAvg();

    var position = 0;
    while (position < bestAvg.length && bestAvg[position].userid != evt.author.id) {
        position++;
    }

    if (position === bestAvg.length)
        evt.reply("You have not rolled yet.");
    else {
        position++;
        var suffix = "th";
        if (position % 10 === 1 && position % 100 !== 11) suffix = 'st';
        if (position % 10 === 2 && position % 100 !== 12) suffix = 'nd';
        if (position % 10 === 3 && position % 100 !== 13) suffix = 'rd'; //tnx Youri because i'm lazy
        evt.reply("at the moment, you are ranked " + position + suffix + ".");
    }
}

async function counter(u, evt) {
    var user = await userRepo.findUserById(u.id);
    var msg;
    if(user === null || user.rolls.lengt === 0){
        msg = "you have not rolled yet";
    } else {
        msg = "you rolled " + user.rolls.length + " times."
    }

    evt.reply(msg);
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
            // =version
            case 'version':
                evt.reply(package.version);
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
                countdown(evt.author, evt);
                break;
                // =best
            case 'best':
                best(evt);
                break;
            case 'rank':
                rank(evt);
                break;
            case 'counter':
                counter(evt.author, evt);
                break;
        }
    }
}