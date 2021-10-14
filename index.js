/*
TODO
  - Use needle
*/
const { Client, Collection, MessageEmbed, Intents, Message } = require('discord.js'); //All discord.js stuff
const token = require('./general/token.json'); //Token file
const config = require('./general/config.json'); //Config file
const db = require('quick.db'); //Database
const { google } = require('googleapis'); //Google api handler
const fs = require('fs'); //File Sync
const request = require('request'); //Api handler
const { create, all } = require('mathjs'); //Mathjs used for handling counting
var express = require('express');
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
const { icoe } = require('./icoe');
const math = create(all);
const limitedEvaluate = math.evaluate;
const intents = new Intents(32767); //ALL
const client = new Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'], ws: { properties: { $browser: "Discord iOS" } }, intents: intents }); //Basic client setup
var invites = db.get(`discord.server.invites`) || [];
var crazyTime = 0;
const attributes = ["SEVERE_TOXICITY", "IDENTITY_ATTACK", "THREAT", "SEXUALLY_EXPLICIT"];
const analyzeRequest = { comment: { text: '' }, requestedAttributes: { SEVERE_TOXICITY: {}, IDENTITY_ATTACK: {}, THREAT: {}, SEXUALLY_EXPLICIT: {} } };
var count = db.get(`discord.count`) || 0;
var topCount = db.get(`discord.topCount`) || 0;
var client_id = token.spotifyId; // Your client id
var client_secret = token.spotifySecret; // Your secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri

//1 Used to store commands and functions to call upon later
client.commands = new Collection();
client.functions = new Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const functionFiles = fs.readdirSync('./functions').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  // Set a new item in the Collection
  // With the key as the command name and the value as the exported module
  client.commands.set(command.name, command);
}

for (const file of functionFiles) {
  const functions = require(`./functions/${file}`);
  // Set a new item in the Collection
  // With the key as the command name and the value as the exported module
  client.functions.set(file.replace(/\.js$/, ''), functions);
}
//1 End

math.import({
  'import': function () { throw new Error('Function import is disabled') },
  'createUnit': function () { throw new Error('Function createUnit is disabled') },
  'compile': function () { throw new Error('Function compile is disabled') },
}, { override: true });

//2 Tons of functions
const log = (channelId = new String, content = new String, color = '#9e9d9d') => {
  const channel = client.channels.cache.get(channelId);
  const embed = new MessageEmbed().setDescription(content).setColor(color);
  channel.send({ embeds: [embed] });
};

const reply = (channelId = new String(), content = new String(), color = '#9e9d9d') => {
  const channel = client.channels.cache.get(channelId);
  const embed = new MessageEmbed().setDescription(content).setColor(color);
  channel.sendTyping();
  setTimeout(() => {
    channel.send({ embeds: [embed] });
  }, 500);
};

const round = (balance = Number) => {
  let bal = balance + '';

  if (bal.length > 3 && bal.length < 7) return `${Math.round(Number(bal) / 100) / 10}k`;
  else if (bal.length > 6 && bal.length < 10) return `${Math.round(Number(bal) / 10000) / 100}m`;
  else if (bal.length > 9 && bal.length < 13) return `${Math.round(Number(bal) / 10000000) / 100}b`;
  else return bal;
};

const floor = (balance = Number) => {
  let bal = balance + '';

  if (bal.length > 3 && bal.length < 7) return `${Math.floor(Number(bal) / 100) / 10}k`;
  else if (bal.length > 6 && bal.length < 10) return `${Math.floor(Number(bal) / 10000) / 100}m`;
  else if (bal.length > 9 && bal.length < 13) return `${Math.floor(Number(bal) / 10000000) / 100}b`;
  else return bal;
};

const hours = (milliseconds = Number) => { return Math.floor(((milliseconds / 1000) / 60) / 60) + 1 };

const updateInvites = () => {
  const guild = client.guilds.cache.get(config.guildId);
  guild.invites.fetch().then(guildInvites => {
    guildInvites.forEach(invite => {
      let yes = true;
      for (let i = 0; i < invites.length; ++i) {
        if (invites[i][0] == invite.code) yes = false;
      }
      if (yes) invites.push([invite.code, invite.uses, invite.inviter.id]);
    });
    db.set(`discord.server.invites`, invites);
  }).catch((err) => {
    console.log(err);
  });
};

const findInvite = (code = String) => {
  for (let i = 0; i < invites.length; ++i) {
    if (invites[i][0] == code) return i;
  }
  return -1;
};

const get_attrs = async (text) => {
  const app = await google.discoverAPI(config.url);
  analyzeRequest.comment.text = text;
  const response = await app.comments.analyze({ key: token.apiKey, resource: analyzeRequest });
  const attrs = {};
  for (let attr of attributes) {
    const prediction = response.data["attributeScores"][attr]["summaryScore"]["value"];
    attrs[attr] = prediction;
  }
  return attrs;
};

const givePoints = () => client.functions.get('givePoints').execute(client, addUserBalance, log);

const getUserBalance = (id = '') => {
  const user = db.get(`discord.users.${id}`) || {};
  return user.balance || 0;
};

const addUserBalance = (id = '', num = 0, reason = String(''), activity = false) => {
  const user = db.get(`discord.users.${id}`) || {};
  const member = client.guilds.cache.get(config.guildId).members.cache.get(id);
  const lb = db.get(`discord.server.leaderboard`) || [];
  Number(user.balance);
  if (activity && member.roles.cache.has('867226596103946250')) {
    num = Math.floor(num * 1.5);
  }
  if (reason != '') {
    if (num > 0) {
      log('830503210951245865', `${num}🦴 to ${member} for ${reason}`, '#baffc9');
    } else {
      log('830503210951245865', `${num}🦴 to ${member} for ${reason}`, '#ff7784');
    }
  }
  user.balance = user.balance + num;
  let included = false;
  for (let i = 0; i < lb.length; ++i) {
    if (lb[i][0] == id) {
      lb[i][1] = user.balance;
      included = true;
      break;
    }
  }
  if (!included) lb.push([id, user.balance]);
  db.set(`discord.server.leaderboard`, lb);
  db.set(`discord.users.${id}`, user);
  return user.balance;
};

const getUserWeekly = (id = '') => {
  const user = db.get(`discord.users.${id}`) || {};
  return user.weekly || 0;
};

const setUserWeekly = (id = '', num = 0) => {
  const user = db.get(`discord.users.${id}`) || {};
  user.weekly = num;
  db.set(`discord.users.${id}`, user);
  return user.weekly;
};

const getUserDaily = (id = '') => {
  const user = db.get(`discord.users.${id}`) || {};
  return user.daily || 0;
};

const setUserDaily = (id = '', num = 0) => {
  const user = db.get(`discord.users.${id}`) || {};
  user.daily = num;
  db.set(`discord.users.${id}`, user);
  return user.daily;
};

const getUserMuted = (id = '') => {
  const user = db.get(`discord.users.${id}`) || {};
  return user.muted || 0;
};

const setUserMuted = (id = '', num = 0) => {
  const user = db.get(`discord.users.${id}`) || {};
  user.muted = num;
  db.set(`discord.users.${id}`, user);
  return user.muted;
};

const getServerAdmins = () => { return db.get(`discord.server.admins`) || [] };

const setServerAdmins = (admins = []) => { db.set(`discord.server.admins`, admins) };

const getServerIgnoredCh = () => { return db.get(`discord.server.ignoredCh`) || [] };

const setServerIgnoredCh = (ignoredCh = []) => { db.set(`discord.server.ignoredCh`, ignoredCh) };

const getUserCooldown = (id = '') => {
  const user = db.get(`discord.users.${id}`) || {};
  return user.cooldown || 0;
};

const setUserCooldown = (id = '', num = 0) => {
  const user = db.get(`discord.users.${id}`) || {};
  user.cooldown = num;
  db.set(`discord.users.${id}`, user);
  return user.cooldown;
};

const setUserBanned = (id = '', num = 0) => {
  const bans = db.get(`discord.server.banned`) || [];
  let contains = false;
  for (let i = 0; i < bans.length; ++i) {
    if (bans[i][0] == id) {
      bans[i][1] = num;
      contains = true;
      break;
    }
  }
  if (!contains) bans.push([Number(id), num]);
  db.set(`discord.server.banned`, bans);
  return;
};

const punish = async (msg) => client.functions.get('punish').execute(client, msg, get_attrs, setUserMuted, reply, log, getServerAdmins, getServerIgnoredCh, attributes);

const APOD = (id = config.APOD_chID) => client.functions.get('APOD').execute(client, id);

const nextLaunch = () => client.functions.get('nextLaunch').execute(client);

const events = () => client.functions.get('events').execute(client);

const counting = () => {
  const channel = client.channels.cache.get('830661661991632907');
  const role = client.guilds.cache.get('830495072876494879').roles.cache.get('830904166007701504');
  channel.messages.fetch({ limit: 10 }, { force: true }).then((messages) => {
    if (messages.first().interaction) client.guilds.cache.get(config.guildId).members.cache.get(messages.first().interaction.user.id).roles.add(role);
    if (messages.first().author.bot) return;
    var error = false;
    try { var number = limitedEvaluate(messages.first().content.toLowerCase()); }
    catch (err) {
      db.set(`discord.count`, 0);
      count = 0;
      messages.first().react('❌');
      messages.first().channel.send(`\`\`\`\n${err}\`\`\``);
      messages.first().channel.send(`Why...\nReset back to 1...`);
      messages.first().member.roles.add(role);
      error = true;
    }
    if (error) return;
    if (number != count + 1) {
      messages.first().channel.send(`Ugh wrong number\nThe right number was ${count + 1} not ${number}\nReset back to 1...`);
      db.set(`discord.count`, 0);
      count = 0;
      messages.first().react('❌');
      messages.first().member.roles.add(role);
    } else {
      if (count == 0) {
        db.set('discord.count', count + 1);
        ++count;
        messages.first().react('✅');
        var mult;
        if (messages.first().member.roles.cache.has('867226596103946250')) mult = 1.5;
        else mult = 1;
        if (count > topCount) {
          db.set('discord.topCount', count);
          topCount = count;
          messages.first().react('🎉');
          addUserBalance(messages.first().author.id, Math.floor(50 * mult));
          log('830503210951245865', `+${Math.floor(50 * mult)}🦴 to ${messages.first().author} for getting a new high score in counting`, '#baffc9');
        } else {
          addUserBalance(messages.first().author.id, Math.floor(5 * mult));
          log('830503210951245865', `+${Math.floor(5 * mult)}🦴 to ${messages.first().author} for counting`, '#baffc9');
        }
      } else {
        if (messages.first().author.id == messages.first(2)[1].author.id) {
          db.set(`discord.count`, 0);
          count = 0;
          messages.first().react('❌');
          messages.first().channel.send(`Why... You cant go after yourself...\nReset back to 1...`);
          messages.first().member.roles.add(role);
        } else {
          db.set('discord.count', count + 1);
          ++count;
          messages.first().react('✅');
          var mult;
          if (messages.first().member.roles.cache.has('867226596103946250')) mult = 1.5;
          else mult = 1;
          if (count > topCount) {
            db.set('discord.topCount', count);
            topCount = count;
            messages.first().react('🎉');
            addUserBalance(messages.first().author.id, Math.floor(50 * mult));
            log('830503210951245865', `+${Math.floor(50 * mult)}🦴 to ${messages.first().author} for getting a new high score in counting`, '#baffc9');
          } else {
            addUserBalance(messages.first().author.id, Math.floor(5 * mult));
            log('830503210951245865', `+${Math.floor(5 * mult)}🦴 to ${messages.first().author} for counting`, '#baffc9');
          }
        }
      }
    }
  }).catch((err) => {
    icoe(err);
  })
};

const updateStreak = (id = new String(), msg = new Message()) => {
  var currentTime = db.get(`discord.users.${id}.streakTime`) || 0;
  var date = new Date();
  if (currentTime <= Math.floor(((date.getTime() / 1000) / 60) / 60) + 24) {
    msg.react('🔥');
    var streak = db.get(`discord.users.${id}.streak`) + 1 || 1;
    for (let i = 0; i < config.streaks.length; ++i) {
      if (streak < config.streaks[i][0]) break;
      else if (streak >= config.streaks[i][0] && !msg.member.roles.cache.has(config.streaks[i][1])) {
        var role = msg.guild.roles.cache.get(config.streaks[i][1]);
        msg.member.roles.add(role, 'New Streak Score');
        addUserBalance(msg.author.id, config.streaks[i][2]);
        msg.react('🦴');
        log(`830503210951245865`, `+${config.streaks[i][2]}🦴 to ${msg.member} for reaching a streak of ${config.streaks[i][0]}`, '#baffc9')
      }
    }
    db.set(`discord.users.${id}.streakTime`, Math.floor(((date.getTime() / 1000) / 60) / 60) + 48);
    db.set(`discord.users.${id}.streak`, streak);
  }
};

const checkInsurance = () => {
  var date = new Date();
  if (date.getDay() == 0 && date.getHours() == 0) {
    var users = db.get(`discord.users`) || {};
    var guild = client.guilds.cache.get('830495072876494879');
    guild.members.cache.forEach((member) => {
      if (users[member.id]) {
        if (member.roles.cache.has('889221970774867968')) {
          var rate = 5000 + Math.floor((users[member.id].insuranceOwed / 3) || 0);
          if (users[member.id].balance >= rate) {
            users[member.id].balance = users[member.id].balance - rate;
            users[member.id].insuranceOwed = (users[member.id].insuranceOwed || 0) - Math.floor((users[member.id].insuranceOwed / 3) || 0);
            log(`830503210951245865`, `-${rate}🦴 to ${member} for insurance`, '#ff7784');
          } else {
            const role = guild.roles.cache.get('889221970774867968');
            member.roles.remove(role, 'Couldn\'t pay insurance');
          }
        }
      }
    });
    db.set(`discord.users`, users);
  }
};
//2 End

//3 Ran when client logs in
client.once('ready', () => {
  process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

  setInterval(givePoints, 60000);

  client.functions.get('updateStatus').execute(client, db, round, getUserBalance, topCount);
  setInterval(() => client.functions.get('updateStatus').execute(client, db, round, getUserBalance, topCount), 300000);

  setTimeout(() => {
    setInterval(() => client.functions.get('updateLeaderboard').execute(client, db, round), 300000);
  }, 30000);

  setTimeout(updateInvites, 4000);

  setInterval(() => client.functions.get('updateMemberCount').execute(client), 900000);

  setInterval(() => client.functions.get('checkCh').execute(client), 15000);

  setInterval(() => client.functions.get('checkMuted').execute(client, db), 30000);

  setInterval(() => client.functions.get('checkBanned').execute(client, db), 30000);

  setInterval(() => {
    if (crazyTime > 0) crazyTime -= 1;
  }, 1000);

  setInterval(() => {
    var date = new Date();
    if (date.getHours() == 7 && date.getMinutes() == 0) APOD();
  }, 60000);

  setTimeout(() => setInterval(nextLaunch, 900000), 60000);

  setTimeout(() => setInterval(events, 900000), 90000);

  setInterval(() => client.functions.get('checkStreaks').execute(client, db), 3600000);

  setInterval(() => {
    var date = new Date();
    if (date.getMonth() == 11 && date.getDate() == 19) {
      client.guilds.cache.get('830495072876494879').members.cache.get('456535616281247751').setNickname('2', 'Don\'t worry abt it');
    }
  }, 60000);

  setInterval(checkInsurance, 3600000)

  console.log('Setting up slash commands');
  var commands = [];
  client.commands.forEach((value, key) => {
    if (value.slash) {
      commands.push({
        name: value.name,
        description: value.description,
        options: value.options
      });
    }
  });
  client.application.commands.set(commands, config.guildId);
  console.log('Finished setting up slash commands');

  console.log(`Logged in as ${client.user.tag}`);
});
//3 End

//4 Currency and message handling
client.on('messageCreate', async (msg) => {

  if (msg.channelId == '830661661991632907') counting();

  if (msg.author.bot || msg.webhookId) return;

  //Dm commands
  if (msg.channel.type == 'DM') {
    const guild = client.guilds.cache.get('830495072876494879');
    const member = guild.members.cache.get(msg.author.id);

    if (!member.roles.cache.get('830496065366130709')) return msg.channel.send('Sorry only owners can run core commands!');
    updateInvites();
    console.log('hi');
  }

  if (msg.channel.type != 'GUILD_TEXT') return;

  if (msg.content.toLowerCase().includes('crazy') && crazyTime == 0) {
    var time = 0;
    var crazy = ['Crazy?', 'I was crazy once.', 'They put me in a rubber room.', 'A rubber room with rats!', 'The rats made me crazy!'];
    crazyTime = 60;
    for (let i = 0; i < crazy.length * 3; ++i) {
      time = time + 1350;
      setTimeout(() => {
        msg.channel.send(crazy[i % crazy.length]);
      }, time);
    }
  }

  //Hate Speech
  punish(msg);

  //Points
  const cooldown = getUserCooldown(msg.author.id);
  if (cooldown < Date.now()) {
    addUserBalance(msg.author.id, 5, `sending a message`, true);
    setUserCooldown(msg.author.id, Date.now() + 60000);
  }

  //Streak Check
  updateStreak(msg.author.id, msg);

  //Announcements commands
  try {
    client.commands.get('announcements').execute(client, msg);
  } catch (err) {
    icoe(err);
    msg.reply('there was an error trying to execute that command!');
  }
});
//4 End

//5 Reaction handler
client.on('messageReactionAdd', (reaction, user) => {
  if (reaction.emoji.name != '💀') return;
  reaction.fetch().then(betterReaction => {
    if (betterReaction.count >= 3) {
      client.channels.cache.get('880999255622451270').messages.fetch({ limit: 10 }).then(messages => {
        var yes = false;
        messages.forEach(message => {
          if (message.embeds[0].footer.text == betterReaction.message.id && !yes) {
            console.log(message.embeds[0].title);
            var embed = message.embeds[0].setTitle(`${betterReaction.count} 💀`);
            console.log(embed.title)
            message.edit({ embeds: [embed] });
            yes = true;
          }
        });
        if (!yes) {
          var embed = new MessageEmbed().setDescription(betterReaction.message.content).setColor('#9e9d9d').setFooter(betterReaction.message.id).setAuthor(betterReaction.message.member.displayName, betterReaction.message.author.avatarURL()).addField('Source', `<#${betterReaction.message.channelId}>`).setTitle(`${betterReaction.count} 💀`);
          if (betterReaction.message.attachments.size > 0) embed.setImage(betterReaction.message.attachments.first().url);
          const channel = client.channels.cache.get('880999255622451270')
          channel.send({ embeds: [embed] });
        }
      }).catch((err) => {
        icoe(err);
      })
    }
  });
});
//5 End

//6 Interaction handler
client.on('interactionCreate', async interaction => {
  //Command Handler
  if (interaction.isCommand()) {
    var admins = getServerAdmins();
    var ignoredCh = getServerIgnoredCh();

    client.commands.forEach((value, key) => {
      if (value.name == interaction.commandName && value.slash) {
        try {
          value.executeI(client, interaction, log, hours, getUserDaily, setUserDaily, getUserWeekly, setUserWeekly, getUserBalance, addUserBalance, floor, client.commands, client.functions.get('updateLeaderboard').execute, getUserMuted, setUserMuted, client.functions.get('updateStatus').execute, setServerAdmins, admins, setServerIgnoredCh, ignoredCh, setUserBanned, round, db/*longest is income*/);
        } catch (err) {
          interaction.reply('there was an error trying to execute that command!');
          icoe(err);
        }
      }
    });
  } /* Select menu Handler */ else if (interaction.isSelectMenu()) {
    client.commands.forEach((value, key) => {
      if (interaction.customId.startsWith(value.name) && value.selectMenu) {
        try {
          value.executeSM(client, interaction, log, hours, getUserDaily, setUserDaily, getUserWeekly, setUserWeekly, getUserBalance, addUserBalance, floor, client.commands, client.functions.get('updateLeaderboard').execute, getUserMuted, setUserMuted, client.functions.get('updateStatus').execute, setServerAdmins, admins, setServerIgnoredCh, ignoredCh, setUserBanned, round, db/**/);
        } catch (err) {
          interaction.reply('there was an error trying to execute that command!');
          icoe(err);
        }
      }
    });
  } /* Button Handler */ else if (interaction.isButton()) {
    client.commands.forEach((value, key) => {
      if (interaction.customId.includes(value.buttonId) && value.button) {
        try {
          value.executeB(client, interaction, log, hours, getUserDaily, setUserDaily, getUserWeekly, setUserWeekly, getUserBalance, addUserBalance, floor, client.commands, client.functions.get('updateLeaderboard').execute, getUserMuted, setUserMuted, client.functions.get('updateStatus').execute, setServerAdmins, admins, setServerIgnoredCh, ignoredCh, setUserBanned, round, db/*longest is income*/);
        } catch (err) {
          interaction.reply('there was an error trying to execute that command!');
          icoe(err);
        }
      }
    });
  }
});
//6 End

//Auto joins threads so that they can have auto mod
client.on('threadCreate', (thread) => {
  thread.join();
  log('830856984579670086', `${thread.name} thread created`);
});

//Shows if a message is edited
client.on('messageUpdate', (oldMsg, newMsg) => {
  if (oldMsg.partial) {
    try {
      oldMsg.fetch().then(fullMessage => {
        if (fullMessage.author.bot) return
        log('830856984579670086', `${fullMessage.author} just edited a past message\nNew: ${newMsg.content}`, '#9e9d9d');
        const yes = punish(newMsg)
        if (yes[0]) newMsg.delete();
      }).catch(err => icoe(err));
    } catch (error) {
      icoe(err);
    }
  } else {

    if (newMsg.author.bot || oldMsg.content == newMsg.content) return;

    if (oldMsg.content) {
      log('830856984579670086', `${newMsg.author} just edited a message\nOld: ${oldMsg.content}\nNew: ${newMsg.content}`, '#9e9d9d');
      const yes = punish(newMsg)
      if (yes[0]) newMsg.delete();
    }
    else {
      log('830856984579670086', `${newMsg.author} just edited a past message\nNew: ${newMsg.content}`, '#9e9d9d');
      const yes = punish(newMsg)
      if (yes[0]) newMsg.delete();
    }
  }
});

//Updates the cache of invites
client.on('inviteCreate', invite => {
  updateInvites();
  let description = '';
  if (invite.targetUser) description += `\nIt was targeted towards ${invite.targetUser.tag}`;
  log('837513841389862932', `${invite.inviter} just created a invite(${invite.code})${description}`, ' #9e9d9d');
});
client.on('inviteDelete', () => { updateInvites(); });

//Sends welcome message plus who invited them
client.on('guildMemberAdd', member => {
  client.guilds.cache.get(config.guildId).invites.fetch().then(guildInvites => {
    guildInvites.forEach(invite => {
      let j = findInvite(invite.code);
      if (j == -1) return;
      if (invite.uses > invites[j][1]) {
        const inviter = client.users.cache.get(invites[j][2]);
        log('832758919059341313', `${member.user}(${member.user.tag}) joined using invite code ${invite.code} from ${inviter}(${inviter.tag}). Invite was used ${invite.uses} times since its creation.`, '#9e9d9d');
      }
    });
  }).catch(err => icoe(err));
  updateInvites();
  var embed = new MessageEmbed().setDescription(`${member.user} just joined!`).setThumbnail(member.user.displayAvatarURL()).setColor('#ffffba');
  const channel = client.channels.cache.get('830505212463546408');
  channel.send({ embeds: [embed] });
  const muted = getUserMuted(member.user.id);
  if (muted == 1) {
    const role = client.guilds.cache.get('830495072876494879').roles.cache.get('830495536582361128');
    member.roles.add(role, `Auto muted on rejoin`);
  }
  request(`https://pronoundb.org/api/v1/lookup?platform=discord&id=${member.user.id}`, { json: true }, (err, res, body) => {
    if (body.pronouns != null) {
      if (body.pronouns == 'other') return member.roles.add(client.guilds.cache.get('830495072876494879').roles.cache.get('869956623488143431'), 'https://pronoundb.org/ claims this member has these pronouns');
      if (body.pronouns == 'sh') return member.roles.add(client.guilds.cache.get('830495072876494879').roles.cache.get('854050147959701554'), 'https://pronoundb.org/ claims she has these pronouns');
      if (body.pronouns.includes('h')) member.roles.add(client.guilds.cache.get('830495072876494879').roles.cache.get('854050148425138186'), 'https://pronoundb.org/ claims he has these pronouns');
      if (body.pronouns.includes('i')) member.roles.add(client.guilds.cache.get('830495072876494879').roles.cache.get('869953400173899776'), 'https://pronoundb.org/ claims it has these pronouns');
      if (body.pronouns.includes('t')) member.roles.add(client.guilds.cache.get('830495072876494879').roles.cache.get('854050147519299594'), 'https://pronoundb.org/ claims they have these pronouns');
      if (body.pronouns.includes('any')) member.roles.add(client.guilds.cache.get('830495072876494879').roles.cache.get('854050146505195520'), 'https://pronoundb.org/ claims they have these pronouns');
      if (body.pronouns.includes('ask')) member.roles.add(client.guilds.cache.get('830495072876494879').roles.cache.get('854050146836021329'), 'https://pronoundb.org/ claims this member has these pronouns');
    }
  });
  log('837513841389862932', `${member}(${member.user.tag}) just joined the server`, '#9e9d9d');
});

//Logs that someone left the server
client.on('guildMemberRemove', member => { log('837513841389862932', `${member}(${member.user.tag}) just left the server`, '#9e9d9d'); });

//Logs deleted messages
client.on('messageDelete', msg => {
  if (msg.partial) {
    try {
      log('830856984579670086', `A message was just deleted but idk what it was ¯\\_(ツ)_/¯`, '#9e9d9d');
    } catch (error) {
      icoe(err);
    }
  } else {
    if (msg.author.bot) return;

    if (msg.content) log('830856984579670086', `${msg.author}'s message was just deleted\n\n${msg.content}`, '#9e9d9d');
  }
});

//Logs bans
client.on('guildBanAdd', (guildBan) => { log('834179033289719839', `${guildBan.user} was just banned`, '#9e9d9d'); });
client.on('guildBanRemove', (guildBan) => { log('834179033289719839', `${guildBan.user} was unbanned`, '#9e9d9d'); });

//Sends rate limit data to bot dev
client.on('rateLimit', rl => {
  const cactus = client.users.cache.get('473110112844644372');
  cactus.send(`Hey um i was just rate limited :(\nLimit: ${rl.limit}\nMethod: ${rl.method}\nPath: ${rl.path}\nRoute: ${rl.route}\nTime Difference: ${rl.timeDifference}\nTimeout: ${rl.timeout}`);
});

//Make sure to shut-down bot
process.on('message', (msg) => {
  if (msg == 'shutdown') {
    console.log('Closing all connections...');
    client.destroy();
    console.log('Finished closing connections');
    process.exit(0);
  }
});

process.on('uncaughtException', error => icoe(error));

//Client login
client.login(token.main);

var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-currently-playing';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

console.log('Listening on 8888');
app.listen(8888);