const { MessageEmbed } = require("discord.js");

module.exports = {
	name: 'income',
	description: 'Sends explanation of the currency system',
	command: false,
	slash: true,
	options: [],
	executeI(client, interaction, log, hours, getUserDaily, setUserDaily, getUserWeekly, setUserWeekly, getUserBalance, addUserBalance, floor, commands, updateLeaderboard, getUserMuted, setUserMuted, updateStatus, setServerAdmins, admins, setServerIgnoredCh, ignoredCh, setUserBanned, round, db) {
		interaction.reply({ embeds: [new MessageEmbed().setDescription(`Ok this is a quick explanation on how points are made on this server. As of when the server first started the two ways to make points goes as follows:\n1. You can make +5:bone: points per minute of messaging. This use's a cooldown system that starts a 1 minute cooldown on point gain.\n2. Spending 1 minute in vc will give you +2:bone: points. If you are not muted you will instead get a total of +5:bone: points. If you are not muted and use camera you will get a total +8:bone: points. If you can not use your camera you can instead screenshare while unmuted to get a total of +6:bone: points.\n3. also events may give points :D\n\n*Vip gives a 1.5x bonus on anything that is activity based*`).setColor('#9e9d9d')] })
	}
};