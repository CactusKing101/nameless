const { MessageEmbed } = require("discord.js");

module.exports = {
	name: 'ignores',
	description: 'Displays the current channels ignored from auto-mod',
  usage: `ignores`,
  command: true,
  aliases: ['ignores'],
  slash: true,
  options: [],
  executeI(client, interaction, log, hours, getUserDaily, setUserDaily, getUserWeekly, setUserWeekly, getUserBalance, addUserBalance, floor, commands, updateLeaderboard, getUserMuted, setUserMuted, updateStatus, setServerAdmins, admins, setServerIgnoredCh, ignoredCh, setUserBanned, round, db) {
    if (interaction.member.roles.cache.has('830496065366130709') || interaction.member.roles.cache.has('830495937301577759')) {
      var description = 'Ignored channels\n';
      for (let i of ignoredCh) {
        description += `${client.channels.cache.get(i).name} - ${i}\n`
      }
      interaction.reply({ embeds: [ new MessageEmbed().setDescription(description).setColor('#9e9d9d') ] });
    } else interaction.reply({ embeds: [ new MessageEmbed().setDescription(`Sorry you don't have perms for this`).setColor('#9e9d9d') ] });
  },
	execute(client, msg, args, reply, log, hours, getUserDaily, setUserDaily, getUserWeekly, setUserWeekly, getUserBalance, addUserBalance, floor, commands, updateLeaderboard, getUserMuted, setUserMuted, updateStatus, setServerAdmins, admins, setServerIgnoredCh, ignoredCh) {
    if (msg.member.roles.cache.has('830496065366130709') || msg.member.roles.cache.has('830495937301577759')) {
      var description = 'Ignored channels\n';
      for (let i of ignoredCh) {
        description += `${client.channels.cache.get(i).name} - ${i}\n`
      }
      reply(msg.channel.id, description, '#9e9d9d');
    } else return reply(msg.channel.id, `Sorry you don't have perms for this`, '#9e9d9d');
	},
};