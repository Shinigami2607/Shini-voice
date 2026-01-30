import { Client, GatewayIntentBits, ChannelType, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, Events } from 'discord.js';
import http from 'http';

// سيرفر صغير باش Render ما يطفيش البوت
http.createServer((req, res) => { res.write("Shini Voice Bot is Online!"); res.end(); }).listen(process.env.PORT || 3000);

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

const activeChannels = new Map();

client.once('ready', () => console.log(`✅ ${client.user.tag} Is Ready!`));

client.on('voiceStateUpdate', async (oldState, newState) => {
    const JOIN_NAME = "Join to Create"; // سمية القناة اللي غتحط فديسكورد

    if (newState.channel?.name === JOIN_NAME) {
        const member = newState.member;
        const channel = await newState.guild.channels.create({
            name: `🔊 ${member.user.username}'s Room`,
            type: ChannelType.GuildVoice,
            parent: newState.channel.parent,
            permissionOverwrites: [
                { id: member.id, allow: [PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.MoveMembers] },
                { id: newState.guild.id, allow: [PermissionsBitField.Flags.Connect] }
            ]
        });

        await member.voice.setChannel(channel);

        // لوحة التحكم (Embed)
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🎛️ Control Panel | Shini Voice')
            .setDescription('استخدم الأزرار أسفله للتحكم في غرفتك الخاصة')
            .addFields(
                { name: '👤 Owner', value: `<@${member.id}>`, inline: true },
                { name: '🔒 Status', value: 'Unlocked', inline: true }
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('v_lock').setLabel('Lock').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('v_unlock').setLabel('Unlock').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('v_rename').setLabel('Rename').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('v_limit').setLabel('Limit').setStyle(ButtonStyle.Secondary)
        );

        const msg = await channel.send({ content: `<@${member.id}>`, embeds: [embed], components: [row] });
        activeChannels.set(channel.id, { ownerId: member.id, msgId: msg.id });
    }

    // حذف الروم فاش تخوى
    if (oldState.channel && oldState.channel.members.size === 0 && activeChannels.has(oldState.channel.id)) {
        await oldState.channel.delete().catch(() => {});
        activeChannels.delete(oldState.channel.id);
    }
});

// التعامل مع الأزرار والمودلز
client.on(Events.InteractionCreate, async interaction => {
    const roomInfo = activeChannels.get(interaction.channelId);
    if (!roomInfo || interaction.user.id !== roomInfo.ownerId) return;

    if (interaction.customId === 'v_rename') {
        const modal = new ModalBuilder().setCustomId('m_rename').setTitle('Rename Room');
        const input = new TextInputBuilder().setCustomId('new_name').setLabel("New Name").setStyle(TextInputStyle.Short);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return interaction.showModal(modal);
    }

    if (interaction.customId === 'v_lock') {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { Connect: false });
        await interaction.reply({ content: "🔒 Room Locked!", ephemeral: true });
    }

    if (interaction.customId === 'v_unlock') {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { Connect: true });
        await interaction.reply({ content: "🔓 Room Unlocked!", ephemeral: true });
    }
});

client.on(Events.InteractionCreate, async i => {
    if (i.isModalSubmit() && i.customId === 'm_rename') {
        const name = i.fields.getTextInputValue('new_name');
        await i.channel.setName(`🔊 ${name}`);
        await i.reply({ content: `✅ Renamed to: ${name}`, ephemeral: true });
    }
});

client.login(process.env.TOKEN);
