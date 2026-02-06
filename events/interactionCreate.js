const { 
    InteractionType, 
    ComponentType, 
    UserSelectMenuBuilder, 
    ActionRowBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle 
} = require('discord.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isButton() && !interaction.isUserSelectMenu() && !interaction.isModalSubmit()) return;

        const { member, guild, customId, channel } = interaction;
        
        // نظام المسح التلقائي
        const autoDelete = async (msg) => {
            setTimeout(() => msg.delete().catch(() => {}), 10000);
        };

        // التحقق من الملكية (Owner Check)
        const isOwner = channel.name.includes(member.displayName);
        if (!isOwner && customId !== 'claim') {
            return interaction.reply({ content: '❌ هاد الروم ماشي ديالك!', ephemeral: true });
        }

        // --- 1. الأزرار (Buttons) ---
        if (interaction.isButton()) {
            
            // تغيير الاسم (NAME)
            if (customId === 'rename') {
                const modal = new ModalBuilder().setCustomId('modal_rename').setTitle('تغيير اسم الروم');
                const input = new TextInputBuilder()
                    .setCustomId('new_name')
                    .setLabel("الاسم الجديد")
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('مثلا: Chill Room')
                    .setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(input));
                return await interaction.showModal(modal);
            }

            // تحديد العدد (LIMIT)
            if (customId === 'limit') {
                const modal = new ModalBuilder().setCustomId('modal_limit').setTitle('تحديد عدد الأشخاص');
                const input = new TextInputBuilder()
                    .setCustomId('new_limit')
                    .setLabel("العدد (من 0 لـ 99)")
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('0 تعني بدون حد')
                    .setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(input));
                return await interaction.showModal(modal);
            }

            // القفل (PRIVACY)
            if (customId === 'privacy') {
                const isLocked = !channel.permissionsFor(guild.roles.everyone).has('Connect');
                await channel.permissionOverwrites.edit(guild.roles.everyone, { Connect: isLocked });
                const res = await interaction.reply({ content: isLocked ? '🔓 تم فتح الروم.' : '🔒 تم قفل الروم.', fetchReply: true });
                return autoDelete(res);
            }

            // الشات (CHAT)
            if (customId === 'chat') {
                const isHidden = !channel.permissionsFor(guild.roles.everyone).has('ViewChannel');
                await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: isHidden });
                const res = await interaction.reply({ content: isHidden ? '👁️ الشات الآن مرئي.' : '🕵️ تم إخفاء الشات.', fetchReply: true });
                return autoDelete(res);
            }

            // الطرد والمنع (KICK / BLOCK)
            if (customId === 'kick' || customId === 'block') {
                const menu = new UserSelectMenuBuilder()
                    .setCustomId(customId === 'kick' ? 'select_kick' : 'select_block')
                    .setPlaceholder('اختار الشخص المقصود')
                    .setMaxValues(1);
                const res = await interaction.reply({ content: '👤 اختر العضو:', components: [new ActionRowBuilder().addComponents(menu)], fetchReply: true });
                return autoDelete(res);
            }

            // الدعوة (INVITE)
            if (customId === 'invite') {
                const menu = new UserSelectMenuBuilder().setCustomId('select_invite').setPlaceholder('اختار شكون تعرض عليه').setMaxValues(1);
                const res = await interaction.reply({ content: '📩 اختر العضو لإرسال دعوة:', components: [new ActionRowBuilder().addComponents(menu)], fetchReply: true });
                return autoDelete(res);
            }

            // الحذف (DELETE)
            if (customId === 'delete') {
                await interaction.reply({ content: '⚠️ سيتم حذف الروم حالا...' });
                return await channel.delete();
            }
        }

        // --- 2. النوافذ (Modals) ---
        if (interaction.isModalSubmit()) {
            if (customId === 'modal_rename') {
                const name = interaction.fields.getTextInputValue('new_name');
                await channel.setName(`🔊 ${name}`);
                const res = await interaction.reply({ content: `✅ تم تغيير الاسم لـ: ${name}`, fetchReply: true });
                autoDelete(res);
            }
            if (customId === 'modal_limit') {
                const limit = parseInt(interaction.fields.getTextInputValue('new_limit'));
                if (isNaN(limit) || limit < 0 || limit > 99) return interaction.reply({ content: '❌ دخل رقم صحيح بين 0 و 99', ephemeral: true });
                await channel.setUserLimit(limit);
                const res = await interaction.reply({ content: `✅ تم تحديد العدد في: ${limit}`, fetchReply: true });
                autoDelete(res);
            }
        }

        // --- 3. القوائم (Select Menus) ---
        if (interaction.isUserSelectMenu()) {
            const targetId = interaction.values[0];
            const target = await guild.members.fetch(targetId);

            if (customId === 'select_kick') {
                await target.voice.disconnect();
                const res = await interaction.reply({ content: `👞 تم طرد ${target.user.tag}`, fetchReply: true });
                autoDelete(res);
            }
            if (customId === 'select_block') {
                await channel.permissionOverwrites.edit(target, { Connect: false });
                await target.voice.disconnect().catch(() => {});
                const res = await interaction.reply({ content: `🚫 تم منع ${target.user.tag} من دخول الروم`, fetchReply: true });
                autoDelete(res);
            }
            if (customId === 'select_invite') {
                const invite = await channel.createInvite({ maxAge: 300 }); // دعوة صالحة لـ 5 دقائق
                await target.send(`📩 تعرضتِ لزيارة غرفة **${member.displayName}**\nرابط الدخول: ${invite.url}`).catch(() => {});
                const res = await interaction.reply({ content: `✅ تم إرسال الدعوة لـ ${target.user.tag} في الخاص`, fetchReply: true });
                autoDelete(res);
            }
        }
    }
};
