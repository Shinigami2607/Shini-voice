const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin')
        .setDescription('أوامر إدارة البوت')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        // أمر Setup
        .addSubcommand(sub => 
            sub.setName('setup').setDescription('إنشاء كاتيكوري وروم One Tap'))
        // أمر Set Admin Role
        .addSubcommand(sub => 
            sub.setName('set-role').setDescription('تحديد رتبة Backup')
            .addRoleOption(opt => opt.setName('role').setDescription('الرتبة').setRequired(true))),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'setup') {
            const category = await interaction.guild.channels.create({
                name: 'SHINI VOICE',
                type: ChannelType.GuildCategory,
            });

            const channel = await interaction.guild.channels.create({
                name: '➕ إضغط لإنشاء روم',
                type: ChannelType.GuildVoice,
                parent: category.id,
            });

            return interaction.reply(`✅ تم الإعداد بنجاح!\nالكاتيكوري: ${category.name}\nالروم: ${channel.name}`);
        }

        if (sub === 'set-role') {
            const role = interaction.options.getRole('role');
            // هنا تقدر تزيد كود باش تحفظ هاد الرتبة فـ Database
            return interaction.reply(`✅ تم تحديد رتبة **${role.name}** كـ Backup.`);
        }
    }
};
