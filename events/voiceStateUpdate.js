const { createInterface } = require('../utils/interface.js');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        const setupChannelName = "➕ إضغط لإنشاء روم"; // تأكد من الاسم
        if (newState.channel?.name === setupChannelName) {
            const member = newState.member;
            const guild = newState.guild;

            // إنشاء الروم
            const channel = await guild.channels.create({
                name: `🔊 | ${member.displayName}`,
                type: 2, // Voice Channel
                permissionOverwrites: [
                    { id: member.id, allow: ['ManageChannels', 'MoveMembers', 'Connect', 'ViewChannel'] },
                    { id: guild.id, allow: ['Connect', 'ViewChannel'] }
                ],
            });

            await newState.setChannel(channel);
            const panel = createInterface();
            await channel.send(panel);
        }

        // مسح الرومات الخاوية
        if (oldState.channel && oldState.channel.members.size === 0 && oldState.channel.name !== setupChannelName) {
            if (oldState.channel.parent?.name === "SHINI VOICE") { // تأكد من الكاتيكوري
                await oldState.channel.delete().catch(() => {});
            }
        }
    },
};
