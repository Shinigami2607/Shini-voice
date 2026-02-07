const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function createInterface() {
    const embed = new EmbedBuilder()
        .setTitle('TempVoice Interface')
        .setDescription('استخدم الأزرار أسفله لإدارة غرفتك الشخصية.\nالمزيد من الخيارات متاحة عبر أوامر /voice.')
        .setColor('#2b2d31')
        .setFooter({ text: 'إضغط على الأزرار للتحكم في الروم.' });

    // الصف الأول: الأوامر الأساسية (المطابقة لـ interactionCreate.js)
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rename').setLabel('NAME').setEmoji('📝').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('limit').setLabel('LIMIT').setEmoji('👥').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('privacy').setLabel('LOCK').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('chat').setLabel('CHAT').setEmoji('💬').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('invite').setLabel('INVITE').setEmoji('📞').setStyle(ButtonStyle.Secondary),
    );

    // الصف الثاني: المنع والطرد
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('kick').setLabel('KICK').setEmoji('🔨').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('block').setLabel('BLOCK').setEmoji('🚫').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('claim').setLabel('CLAIM').setEmoji('👑').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('delete').setLabel('DELETE').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
    );

    return { embeds: [embed], components: [row1, row2] };
}

module.exports = { createInterface };
