module.exports = {
	name: 'leaderboard',
	description: 'Updates the leaderboard',
  usage: `leaderboard`,
  command: true,
  aliases: ['leaderboard', 'lb'],
	execute(client, msg, args, reply, log, hours, getUserDaily, setUserDaily, getUserWeekly, setUserWeekly, getUserBalance, addUserBalance, floor, commands, updateLeaderboard, getUserMuted, setUserMuted, updateStatus, setServerAdmins, admins, setServerIgnoredCh, ignoredCh, setUserBanned) {
    if (msg.member.roles.cache.has('830496065366130709')) {
      updateLeaderboard();
      reply(msg.channel.id, `Updated the leaderboard`, '#ffffba');
    } else reply(msg.channel.id, `You don't have perms for that you dumb`, '#9e9d9d');
  }
};