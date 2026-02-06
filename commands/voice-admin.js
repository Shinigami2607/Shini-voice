const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voice-admin')
        .setDescription('التحكم الشامل في الرومات')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommand(sub => sub.setName('lock-all').setDescription('قفل جميع الرومات'))
        .addSubcommand(sub => sub.setName('reset').setDescription('مسح جميع الرومات المؤقتة'))
        .addSubcommand(sub => sub.setName('stats').setDescription('إحصائيات الرومات الحالية')),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const category = interaction.guild.channels.cache.find(c => c.name === 'SHINI VOICE');

        if (!category) return interaction.reply('❌ لم يتم العثور على كاتيكوري SHINI VOICE.');

        const tempChannels = interaction.guild.channels.cache.filter(c => c.parentId === category.id && c.id !== 'ID_ONE_TAP');

        if (sub === 'lock-all') {
            tempChannels.forEach(ch => ch.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: false }));
            return interaction.reply('🔒 تم قفل جميع الرومات المؤقتة.');
        }

        if (sub === 'stats') {
            return interaction.reply(`📊 عدد الرومات المفتوحة حالياً: **${tempChannels.size}**`);
        }

        if (sub === 'reset') {
            tempChannels.forEach(ch => ch.delete().catch(() => {}));
            return interaction.reply('♻️ تم مسح جميع الرومات وإعادة الضبط.');
        }
    }
};
