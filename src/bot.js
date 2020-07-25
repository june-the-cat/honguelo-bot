#!/usr/bin/env node

var logger = require('winston');
var schedule = require('node-schedule');
const package = require('../package.json');
const userRepo = require('./userRepo.js')
const discordHandler = require('./discordHandler');
const rollHandler = require('./rollHandler.js');
const seasonInfo = require('./resources/season.json');

var currentSeason;
for (var i = 0; i < seasonInfo.length; i++) {
    if (new Date(seasonInfo[i].startDate).getTime() < (new Date()).getTime() &&
        new Date(seasonInfo[i].endDate).getTime() > (new Date()).getTime())
        currentSeason = seasonInfo[i];
}

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';

discordHandler.setHandler(handleMessage);

var midnightPost = schedule.scheduleJob('0 0 0 * * *', async function () {
    let rollsByBest = await userRepo.findAllOrderByBestRoll(false, currentSeason.number);
    if (rollsByBest === null) return;

    rollsByBest.sort(rollHandler.userRollComparator(currentSeason.number));

    var msg = "```It is currently midnight, " + new Date().getDate() + "/" + (new Date().getMonth() + 1) + ".\n" +
        "The best roll so far is " + rollsByBest[0].best_roll + " from " + rollsByBest[0].username + ".\n";

    let rollsByAvg = await userRepo.findAllOrderByAvg(false, currentSeason.number);
    if (rollsByAvg === null) return;

    rollsByAvg.sort(rollHandler.userScoreComparator(currentSeason.number));

    var tot = 100;
    if (rollsByAvg.length < tot)
        tot = rollsByAvg.length;
    msg += "The top " + tot + " scores are: ";

    for (var i = 0; i < tot; i++) {
        let avg = rollsByAvg[i].average;
        //Round to 2 decimal places
        avg = Math.round(avg * 100) / 100
        msg += "\n" + (i + 1) + " - " + rollsByAvg[i].username + ": " + avg + "";
    }

    msg += "\n\nYou can now roll again.```";
    msg += "\n<@&" + await discordHandler.getRole(null, "Addicted").id + "> Ping.";
    discordHandler.sendMessageToChannel('723818579845185536', msg); //leaderboard id


    var oldSeason = currentSeason;
    for (var i = 0; i < seasonInfo.length; i++) {
        if (new Date(seasonInfo[i].startDate).getTime() < (new Date()).getTime() &&
            new Date(seasonInfo[i].endDate).getTime() > (new Date()).getTime())
            currentSeason = seasonInfo[i];
    }

    if (oldSeason != currentSeason) {
        discordHandler.clearAllRankedRoles();
        discordHandler.sendMessageToChannel('723818579845185536', "The season is over.");
    }
});

async function getaverage(userid, season) {
    if (season === undefined || season === null || season === "") season = currentSeason.number;
    else if (isNaN(season) || parseInt(season) > currentSeason.number) return "season not valid";

    var userRes = await userRepo.findUserById(userid, season);

    if (!userRes || userRes.rolls.length === 0) {
        return "you have not rolled yet.";
    } else {
        var avg = userRes.average;
        //Round to 2 decimal places
        avg = Math.round(avg * 100) / 100
        return "your score is " + avg.toString();
    }
}

async function lastRoll(userid) {
    var result = await userRepo.findUserById(userid, currentSeason.number);
    if (!result) {
        return "you haven't rolled yet. Use the command =roll to start playing.";
    } else {
        return "your last roll was " + result.rolls[result.rolls.length - 1].toString();
    }
}

async function findtop(userid, season) {
    if (season === undefined || season === null || season === "") season = currentSeason.number;
    else if (isNaN(season) || parseInt(season) > currentSeason.number) return "season not valid";

    var result = await userRepo.findUserById(userid, season);

    if (!result) {
        return "you haven't rolled yet. Use the command =roll to start playing.";
    } else {
        return "your top roll was " + result.best_roll;
    }
}

async function findBot(userid, season) {
    if (season === undefined || season === null || season === "") season = currentSeason.number;
    else if (isNaN(season) || parseInt(season) > currentSeason.number) return "season not valid";

    var result = await userRepo.findUserById(userid, season);

    if (!result) {
        return "you haven't rolled yet. Use the command =roll to start playing.";
    } else {
        return "your bottom roll was " + result.worse_roll;
    }
}

function helpMessage() {
    return "```=Help: Shows all of HONGUELO's commands. Looking at that right now!\n" +
        "=Roll: Rolls for your ELO if you haven't done so today\n" +
        "=Practice: Do a practice roll\n" +
        "=Last: Shows your last roll\n" +
        "=Leagues: Displays the leagues, and how to get them\n" +
        "=Score [Season]: Shows your score for the season\n" +
        "=Top [Season]: Displays your highest roll for the season\n" +
        "=Bottom [Season]: Displays your lowest roll for the season\n" +
        "=Countdown: Displays time until your next roll\n" +
        "=Best [Season]: Shows the best roll for the season and the best score for the season\n" +
        "=Leaderboard <Roll | Score> [reverse]: Shows the top 5 rolls this season and the top 5 scores\n" +
        "=Rank [Season]: Shows your rank compared to everyone else's\n" +
        "=Counter [Season]: Shows the number of rolls you made\n" +
        "=Season: Shows info about the current season\n" +
        "=List [Season]: Shows all your rolls in the season```";
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

async function countdown(userid) {
    var result = await userRepo.findUserById(userid, currentSeason.number);
    if (result != null && !rollHandler.userCanRoll(result)) {
        var next = new Date();
        next.setHours(0, 0, 0, 0);
        next.setDate(next.getDate() + 1);
        var diffInSec = Math.floor((next - new Date()) / (1000));
        var diffInMinutes = Math.floor(diffInSec / 60);
        var diffInHours = Math.floor(diffInMinutes / 60);
        return "next roll available in " + diffInHours + " hours, " + (diffInMinutes - diffInHours * 60) + " minutes, " + (diffInSec - diffInMinutes * 60) + " seconds.";
    } else {
        return "you can roll now.";
    }
}

async function best(season) {
    if (season === undefined || season === null || season === "") season = currentSeason.number;
    else if (isNaN(season) || parseInt(season) > currentSeason.number) return "season not valid";

    var bestRolls = await userRepo.findAllOrderByBestRoll(false, season);

    bestRolls.sort(rollHandler.userRollComparator(season));

    if (bestRolls === null || bestRolls.length === 0) {
        return "there have been no rolls this season so far";
    }

    var msg = "the best roll for this season is `" + bestRolls[0].best_roll + "` from `" + bestRolls[0].username + "`.\n"

    var bestAvg = await userRepo.findAllOrderByAvg(false, season);

    bestAvg.sort(rollHandler.userScoreComparator(season));

    if (bestAvg === null || bestAvg.length === 0) {
        return "there have been no rolls this season so far";
    }

    msg += "The best score for this season is `" + bestAvg[0].average.toFixed(2) + "` from `" + bestAvg[0].username + "`.";

    return msg;
}

async function rank(userid, season) {
    if (season === undefined || season === null || season === "") season = currentSeason.number;
    else if (isNaN(season) || parseInt(season) > currentSeason.number) return "season not valid";

    var bestAvg = await userRepo.findAllOrderByAvg(false, season);
    bestAvg.sort(rollHandler.userScoreComparator(season));

    var position = 0;
    while (position < bestAvg.length && bestAvg[position].userid != userid) {
        position++;
    }

    if (position === bestAvg.length)
        return "You have not rolled yet.";
    else {
        position++;
        var suffix = "th";
        if (position % 10 === 1 && position % 100 !== 11) suffix = 'st';
        if (position % 10 === 2 && position % 100 !== 12) suffix = 'nd';
        if (position % 10 === 3 && position % 100 !== 13) suffix = 'rd'; //tnx Youri because i'm lazy
        return "at the moment, you are ranked " + position + suffix + ".";
    }
}

async function counter(userid, season) {
    if (season === undefined || season === null || season === "") season = currentSeason.number;
    else if (isNaN(season) || parseInt(season) > currentSeason.number) return "season not valid";

    var user = await userRepo.findUserById(userid, season);
    var msg;
    if (user === null || user.rolls.length === 0) {
        msg = "you have not rolled yet";
    } else {
        msg = "you rolled " + user.rolls.length + " times."
    }

    return msg;
}

function seasonMessage() {

    var days = Math.floor((new Date() - new Date(currentSeason.startDate)) / 1000 / 60 / 60 / 24);

    var msg = "Current season started on " + currentSeason.startDate + ", " + days + " days ago.\n" +
        "It will end on " + currentSeason.endDate + ".\n" +
        "The rules are as follows: \n" + currentSeason.description;

    return msg;
}

async function listRolls(userid, season) {
    if (season === undefined || season === null || season === "") season = currentSeason.number;
    else if (isNaN(season) || parseInt(season) > currentSeason.number) return "season not valid";

    var user = await userRepo.findUserById(userid, season);
    var msg;

    if (user === null || user.rolls.length === 0) {
        msg = "you have not rolled yet";
    } else {
        var rolls = user.rolls.sort();
        msg = "your rolls are " + rolls.join(", ") + "."
    }

    return msg;
}

async function leaderboard(args) {

    var msg;
    var reverse = (args[1] === "reverse");

    var season = reverse ? args[2] : args[1];

    if (season === undefined || season === null || season === "") season = currentSeason.number;
    else if (isNaN(season) || parseInt(season) > currentSeason.number) return "season not valid";

    var rolls;
    if (args[0] === "roll") {
        if (reverse) msg = "Bottom 5 by roll:"
        else msg = "Top 5 by roll:";

        rolls = await userRepo.findAllOrderByBestRoll(reverse, season);
        if (rolls === null) "There was an error trying to fetch the rolls";

        rolls.sort(rollHandler.userRollComparator(season));
        if(reverse) rolls.reverse();

    } else if (args[0] === "score") {
        if (reverse) msg = "Bottom 5 by score:"
        else msg = "Top 5 by score:";

        rolls = await userRepo.findAllOrderByAvg(reverse, season);
        if (rolls === null) "There was an error trying to fetch the rolls";

        rolls.sort(rollHandler.userScoreComparator(season));
        if(reverse) rolls.reverse();    
    } else {
        return "arguments not recognized. Say leaderboard score or leaderboard roll";
    }

    tot = 5;
    if (rolls.length < tot)
        tot = rolls.length;
    for (var i = 0; i < tot; i++) {
        let num;

        if (args[0] === "roll")
            if (reverse) num = rolls[i].worse_roll;
            else num = rolls[i].best_roll;
        else if (args[0] === "score") num = rolls[i].average;

        //Round to 2 decimal places
        num = Math.round(num * 100) / 100
        msg += "\n" + (i + 1) + " - " + rolls[i].username + ": " + num + "";
    }

    return msg;
}

async function handleMessage(evt) {
    message = evt.content;
    /* Break the comment in case of DUNAK
    evt.react(evt.guild.emojis.cache.find(emoji => emoji.name === "pog"))
    .then(console.log)
    .catch(console.error);*/

    if (evt.author.id != '279656190655463425') return;

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
                rollHandler.evtRoll(evt, currentSeason.number);
                break;
                // =practice
            case 'practice':
                evt.reply(rollHandler.roll());
                break;
                // =help
            case 'help':
                evt.reply(helpMessage());
                break;
                // =leagues
            case 'leagues':
            case 'league':
                evt.reply(leaguesMessage());
                break;
                // =score
            case 'score':
                evt.reply(await getaverage(evt.author.id, args[0]));
                break;
                // =last
            case 'last':
                evt.reply(await lastRoll(evt.author.id));
                break;
                // =top
            case 'top':
                evt.reply(await findtop(evt.author.id, args[0]));
                break;
                // =countdown
            case 'countdown':
            case 'time':
                evt.reply(await countdown(evt.author.id));
                break;
                // =best
            case 'best':
                evt.reply(await best(args[0]));
                break;
            case 'rank':
                evt.reply(await rank(evt.author.id, args[0]));
                break;
            case 'counter':
            case 'count':
                evt.reply(await counter(evt.author.id, args[0]));
                break;
            case 'bot':
            case 'bottom':
                evt.reply(await findBot(evt.author.id, args[0]));
                break;
            case 'season':
                evt.reply(seasonMessage());
                break;
            case 'list':
                evt.reply(await listRolls(evt.author.id, args[0]));
                break;
            case 'leaderboard':
                evt.reply(await leaderboard(args));
                break;
            case 'juneplsaddthesecommands':
                evt.reply("no.");
                break;
        }
    }
}