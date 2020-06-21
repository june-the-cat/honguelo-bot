var Discord = require('discord.js');
var logger = require('winston');
var auth = require('./auth.json');
var User = require("./user.js")
const MongoClient = require('mongodb').MongoClient;
const roles = ["F2P","Normal League", "Sadistic League", "Evil League","Whales League", "Unranked"];

const uri = auth.mongoConnectionString;
const mongo = new MongoClient(uri, { useNewUrlParser: true });
var rolls;
mongo.connect(err => {
  rolls = mongo.db("user_data").collection("rolls");
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

function rollElo(user, evt){
    rolls.findOne({"userid" : user.id}, (err, result) => {
        if (err) throw err;

        var userRes;
        if(!result){
                userRes = new User(user.id, user.username);
        } else {
                userRes = result;
        }

        var reply;

        var midnight = new Date();
        midnight.setHours(0,0,0,0);
        if(userRes.lastRoll >= midnight){
            //if(userRes.lastRoll >= (new Date()).setSeconds(0,0)){
                var getout = client.emojis.cache.find(emoji => emoji.name === "getout");
                reply = `you already had your roll today. ${getout}`;
        } else {
            var rollres = roll();

            var reply = rollres.toString();
            if(userRes._id === null){
                var insert = {rolls: [rollres], userid : user.id, username: user.username, lastRoll : new Date()};
                rolls.insertOne(insert);
            } else {
                var query = {_id : userRes._id};
                var values = {$push: {rolls: rollres}, $set: {lastRoll: new Date()}};
                rolls.updateOne(query, values, (err, res) => {
                    if (err) throw err;
                    console.log("saved one value")});
                }
                    
                //Deal with roles
                for(var i = 0; i < roles.length; i++){
                    var role = roles[i];
                        var ro = evt.guild.roles.cache.find(r => r.name === role);
                        if(evt.member.roles.cache.find(r => r.name === role));
                            evt.member.roles.remove(ro.id);
                };

                var roleName = roles[Math.floor(rollres/1000)];
                var role = evt.guild.roles.cache.find(role => role.name === roleName);
                evt.member.roles.add(role);
        }

        evt.reply(reply);
    });
}

function roll(){
    var res = Math.round(Math.random()*5000 + 1);

    return res;
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
        switch(cmd) {
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
         }
     }
}