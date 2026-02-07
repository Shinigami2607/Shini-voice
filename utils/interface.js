const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function createInterface() {
    const embed = new EmbedBuilder()
        .setTitle('TempVoice Interface')
        .setDescription('This interface can be used to manage temporary voice channels.\nMore options are available with /voice commands.')
        .setColor('#2b2d31')
        .setFooter({ text: 'Press the buttons below to use the interface.' });

    // الصف الأول ديال البوطونات
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('vc_name').setLabel('NAME').setEmoji('🆔').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('vc_limit').setLabel('LIMIT').setEmoji('👥').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('vc_lock').setLabel('PRIVACY').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('vc_waiting').setLabel('WAITING R.').setEmoji('🕒').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('vc_chat').setLabel('CHAT').setEmoji('💬').setStyle(ButtonStyle.Secondary),
    );

    // الصف الثاني
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('vc_trust').setLabel('TRUST').setEmoji('👤').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('vc_untrust').setLabel('UNTRUST').setEmoji('🚫').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('vc_invite').setLabel('INVITE').setEmoji('📞').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('vc_kick').setLabel('KICK').setEmoji('🔨').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('vc_region').setLabel('REGION').setEmoji('🌍').setStyle(ButtonStyle.Secondary),
    );

    // الصف الثالث
    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('vc_block').setLabel('BLOCK').setEmoji('🚫').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('vc_unblock').setLabel('UNBLOCK').setEmoji('🔓').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('vc_claim').setLabel('CLAIM').setEmoji('👑').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('vc_transfer').setLabel('TRANSFER').setEmoji('📈').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('vc_delete').setLabel('DELETE').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
    );

    return { embeds: [embed], components: [row1, row2, row3] };
}

module.exports = { createInterface };
