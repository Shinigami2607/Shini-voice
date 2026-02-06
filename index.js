import { 
    Client, 
    GatewayIntentBits, 
    Events, 
    PermissionsBitField, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ChannelType, 
    PermissionFlagsBits, 
    Collection, 
    REST, 
    Routes, 
    RoleSelectMenuBuilder, 
    UserSelectMenuBuilder 
} from 'discord.js';

// ==========================================
// TOKEN MEN DISCLOUD ENVIRONMENT
// ==========================================
const TOKEN = process.env.TOKEN;

if (!TOKEN) {
    console.error('❌ TOKEN ma kaynch! Zid TOKEN f Discloud Environment Variables.');
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.MessageContent
    ]
});

// ==========================================
// STATE MANAGEMENT
// ==========================================
const tempRooms = new Collection();
const motherChannels = new Collection();
const staffRoles = new Collection();

const MOTHER_PREFIX = '➕';
const AUTO_DELETE_MS = 10000;

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const autoDeleteReply = async (interaction, content, ephemeral = true) => {
    try {
        const reply = await interaction.reply({ content, ephemeral, fetchReply: true });
        setTimeout(() => reply.delete().catch(() => {}), AUTO_DELETE_MS);
        return reply;
    } catch (e) {
        console.error('Auto-delete reply error:', e);
    }
};

const autoDeleteUpdate = async (interaction, content, ephemeral = true) => {
    try {
        await interaction.update({ content, components: [], embeds: [], ephemeral });
        const message = await interaction.fetchReply();
        setTimeout(() => message.delete().catch(() => {}), AUTO_DELETE_MS);
    } catch (e) {
        console.error('Auto-delete update error:', e);
    }
};

const autoDeleteFollowUp = async (interaction, content, ephemeral = true) => {
    try {
        const reply = await interaction.followUp({ content, ephemeral, fetchReply: true });
        setTimeout(() => reply.delete().catch(() => {}), AUTO_DELETE_MS);
        return reply;
    } catch (e) {
        console.error('Auto-delete followUp error:', e);
    }
};

// ==========================================
// PERMISSION CHECKS
// ==========================================
const isServerOwner = (member) => member.id === member.guild.ownerId;

const isStaffOrOwner = (member) => {
    if (isServerOwner(member)) return true;
    const staffRoleId = staffRoles.get(member.guild.id);
    if (staffRoleId && member.roles.cache.has(staffRoleId)) return true;
    return false;
};

const getRoomDataByTextChannel = (textChannelId) => {
    for (const [voiceId, data] of tempRooms) {
        if (data.textChannelId === textChannelId) return { voiceChannelId: voiceId, ...data };
    }
    return null;
};

// ==========================================
// INTERFACE CREATION
// ==========================================
const createRoomInterface = async (textChannel, voiceChannel) => {
    const roomData = tempRooms.get(voiceChannel.id);
    
    const embed = new EmbedBuilder()
        .setTitle('🎙️ Voice Room Control Panel')
        .setDescription(`**Channel:** <#${voiceChannel.id}>\n**Owner:** <@${roomData?.ownerId}>\n\nManage your room using the controls below.`)
        .setColor(0x5865F2)
        .setThumbnail('https://cdn.discordapp.com/emojis/1056024654695182356.webp')
        .addFields(
            { name: '🔒 Lock System', value: 'Control room access', inline: true },
            { name: '👥 User Limit', value: 'Set capacity (0-99)', inline: true },
            { name: '✏️ Rename', value: 'Change channel name', inline: true },
            { name: '💬 Text Chat', value: 'Toggle chat visibility', inline: true },
            { name: '🛡️ Moderation', value: 'Ban, Unban, Kick users', inline: true },
            { name: '👑 Ownership', value: 'Claim or Transfer', inline: true }
        )
        .setFooter({ text: 'TempVoice System • Buttons are isolated to this room only' })
        .setTimestamp();

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('lock').setLabel('🔒 Lock').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('unlock').setLabel('🔓 Unlock').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('limit').setLabel('👥 Limit').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('rename').setLabel('✏️ Rename').setStyle(ButtonStyle.Primary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('chat_on').setLabel('💬 Chat ON').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('chat_off').setLabel('🚫 Chat OFF').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('ban').setLabel('🚫 Ban').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('unban').setLabel('✅ Unban').setStyle(ButtonStyle.Success)
    );

    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('kick').setLabel('👢 Kick').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('claim').setLabel('👑 Claim').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('transfer').setLabel('🔄 Transfer').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('invite').setLabel('📩 Invite').setStyle(ButtonStyle.Secondary)
    );

    try {
        const msg = await textChannel.send({ embeds: [embed], components: [row1, row2, row3] });
        return msg.id;
    } catch (error) {
        console.error('Failed to create interface:', error);
        return null;
    }
};

// ==========================================
// COMMANDS DEFINITION
// ==========================================
const commands = [
    {
        name: 'setrole',
        description: 'Set optional staff role for TempVoice (Server Owner only)',
        type: 1,
        default_member_permissions: PermissionFlagsBits.Administrator
    },
    {
        name: 'voice',
        description: 'Create a mother channel generator (Server Owner or Staff)',
        type: 1,
        options: [
            {
                name: 'name',
                description: 'Name for the mother channel',
                type: 3,
                required: true
            }
        ]
    }
];

// ==========================================
// EVENT: BOT READY
// ==========================================
client.once(Events.ClientReady, async () => {
    console.log(`✅ Bot logged in as ${client.user.tag}`);
    console.log(`🌐 Ready to work on any server! No setup required.`);
    
    try {
        const rest = new REST({ version: '10' }).setToken(TOKEN);
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('🚀 Global commands registered');
    } catch (error) {
        console.error('❌ Command registration failed:', error);
    }
});

// ==========================================
// EVENT: VOICE STATE UPDATE (CORE LOGIC)
// ==========================================
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    // CASE 1: User joined a channel (not switched)
    if (newState.channel && !oldState.channel) {
        const channel = newState.channel;
        
        const isMother = channel.name.startsWith(MOTHER_PREFIX) || motherChannels.has(channel.id);
        
        if (isMother) {
            try {
                const roomName = `🎙️ ${newState.member.displayName}'s Room`;
                const voiceChannel = await channel.guild.channels.create({
                    name: roomName,
                    type: ChannelType.GuildVoice,
                    parent: channel.parentId,
                    permissionOverwrites: [
                        {
                            id: channel.guild.id,
                            allow: [PermissionsBitField.Flags.Connect]
                        },
                        {
                            id: newState.member.id,
                            allow: [
                                PermissionsBitField.Flags.ManageChannels,
                                PermissionsBitField.Flags.MuteMembers,
                                PermissionsBitField.Flags.DeafenMembers,
                                PermissionsBitField.Flags.MoveMembers,
                                PermissionsBitField.Flags.ViewChannel
                            ]
                        }
                    ]
                });

                const textChannelName = `room-${newState.member.displayName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
                const textChannel = await channel.guild.channels.create({
                    name: textChannelName,
                    type: ChannelType.GuildText,
                    parent: channel.parentId,
                    permissionOverwrites: [
                        {
                            id: channel.guild.id,
                            deny: [PermissionsBitField.Flags.ViewChannel]
                        },
                        {
                            id: newState.member.id,
                            allow: [
                                PermissionsBitField.Flags.ViewChannel,
                                PermissionsBitField.Flags.SendMessages,
                                PermissionsBitField.Flags.ReadMessageHistory,
                                PermissionsBitField.Flags.EmbedLinks,
                                PermissionsBitField.Flags.AttachFiles
                            ]
                        }
                    ]
                });

                tempRooms.set(voiceChannel.id, {
                    ownerId: newState.member.id,
                    textChannelId: textChannel.id,
                    createdAt: Date.now(),
                    motherChannelId: channel.id
                });

                await newState.member.voice.setChannel(voiceChannel);
                await createRoomInterface(textChannel, voiceChannel);

                console.log(`✅ Created room: ${roomName} in ${channel.guild.name}`);

            } catch (error) {
                console.error('❌ Error creating temp room:', error);
                try {
                    await newState.member.send('❌ Ma qdertch ncreé room! Jareb merra okhra.').catch(() => {});
                } catch {}
            }
        }
    }

    // CASE 2: User left a channel completely
    if (oldState.channel && !newState.channel) {
        const roomData = tempRooms.get(oldState.channel.id);
        
        if (roomData && roomData.ownerId === oldState.member.id) {
            try {
                const textChannel = oldState.guild.channels.cache.get(roomData.textChannelId);
                
                if (textChannel) {
                    await textChannel.delete().catch(err => console.log('Text channel delete error:', err));
                }
                
                await oldState.channel.delete().catch(err => console.log('Voice channel delete error:', err));
                
                tempRooms.delete(oldState.channel.id);
                console.log(`🗑️ Deleted room: Owner left`);
            } catch (error) {
                console.error('❌ Error deleting room:', error);
            }
        }
    }

    // CASE 3: User switched channels
    if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
        const roomData = tempRooms.get(oldState.channel.id);
        
        if (roomData && roomData.ownerId === oldState.member.id) {
            try {
                const textChannel = oldState.guild.channels.cache.get(roomData.textChannelId);
                
                if (textChannel) await textChannel.delete().catch(() => {});
                await oldState.channel.delete().catch(() => {});
                
                tempRooms.delete(oldState.channel.id);
                console.log(`🗑️ Deleted room: Owner switched`);
            } catch (error) {
                console.error('❌ Error deleting room on switch:', error);
            }
        }
    }
});

// ==========================================
// EVENT: INTERACTION CREATE
// ==========================================
client.on(Events.InteractionCreate, async (interaction) => {
    try {
        // ==================== SLASH COMMANDS ====================
        if (interaction.isChatInputCommand()) {
            
            if (interaction.commandName === 'setrole') {
                if (!isServerOwner(interaction.member)) {
                    return await autoDeleteReply(interaction, '⛔ Hada command khasso ykoun Server Owner berra7! Ma3ndksh l7e9.');
                }

                const row = new ActionRowBuilder().addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId('select_staff_role')
                        .setPlaceholder('Sélectionné staff role mn lista')
                );

                return await interaction.reply({
                    content: '👇 Sélectionné role li ghadi ykoun staff (ikhtiyari):',
                    components: [row],
                    ephemeral: true
                });
            }

            if (interaction.commandName === 'voice') {
                if (!isStaffOrOwner(interaction.member)) {
                    return await autoDeleteReply(interaction, '⛔ Ghir Server Owner y9der ycreé mother channel! /setrole khass ila bghiti tzid staff.');
                }

                const name = interaction.options.getString('name');
                if (!name || name.length < 1 || name.length > 100) {
                    return await autoDeleteReply(interaction, '❌ Smit channel khasso ykoun m3ayyan o ma yfoutch 100 character!');
                }

                try {
                    const channel = await interaction.guild.channels.create({
                        name: `${MOTHER_PREFIX} ${name}`,
                        type: ChannelType.GuildVoice,
                        permissionOverwrites: [
                            {
                                id: interaction.guild.id,
                                allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.ViewChannel]
                            }
                        ]
                    });

                    motherChannels.set(channel.id, {
                        guildId: interaction.guild.id,
                        creatorId: interaction.user.id
                    });

                    return await autoDeleteReply(interaction, `✅ Safye, créé mother channel: **${channel.name}**\n\nℹ️ **Kifach tkhdem:** Dkhél l had channel bach tcreé room dyalek!`);
                } catch (error) {
                    console.error('Mother channel creation error:', error);
                    return await autoDeleteReply(interaction, '❌ Ma qdertch ncreé channel! Vérifié permissions dyali.');
                }
            }
        }

        // ==================== ROLE SELECT MENU ====================
        if (interaction.isRoleSelectMenu() && interaction.customId === 'select_staff_role') {
            const roleId = interaction.values[0];
            staffRoles.set(interaction.guild.id, roleId);
            
            await autoDeleteUpdate(interaction, `✅ Staff role tbeddel b nja7! Daba role <@&${roleId}> y9der ycreé mother channels.`);
            return;
        }

        // ==================== BUTTON INTERACTIONS ====================
        if (interaction.isButton()) {
            const roomInfo = getRoomDataByTextChannel(interaction.channel.id);
            
            if (!roomInfo) {
                return await autoDeleteReply(interaction, '❌ Hada mashi room dyalk! Had interface ma khdamch hna.');
            }

            const { voiceChannelId, ownerId } = roomInfo;
            const voiceChannel = interaction.guild.channels.cache.get(voiceChannelId);
            
            if (!voiceChannel) {
                return await autoDeleteReply(interaction, '❌ Room ma kaynch! Ymkn tdelet.');
            }

            const isOwner = ownerId === interaction.user.id;
            const memberInRoom = voiceChannel.members.has(interaction.user.id);

            switch (interaction.customId) {
                case 'lock': {
                    if (!isOwner) return await autoDeleteReply(interaction, '⛔ Hada mashi room dyalk! Ghir owner y9der isekk room.');
                    
                    await voiceChannel.permissionOverwrites.edit(interaction.guild.id, { Connect: false });
                    return await autoDeleteReply(interaction, '🔒 Room tsekkert b nja7! Hta wahed ma y9der ydkhel daba.');
                }

                case 'unlock': {
                    if (!isOwner) return await autoDeleteReply(interaction, '⛔ Hada mashi room dyalk! Ghir owner y9der ifette7 room.');
                    
                    await voiceChannel.permissionOverwrites.edit(interaction.guild.id, { Connect: true });
                    return await autoDeleteReply(interaction, '🔓 Room tfett7et b nja7! Kola wahed y9der ydkhel daba.');
                }

                case 'limit': {
                    if (!isOwner) return await autoDeleteReply(interaction, '⛔ Hada mashi room dyalk! Ghir owner y9der ibdel limit.');
                    
                    const modal = new ModalBuilder()
                        .setCustomId('limit_modal')
                        .setTitle('User Limit Settings');
                    
                    const input = new TextInputBuilder()
                        .setCustomId('limit_value')
                        .setLabel('Ch7al men user? (0 = unlimited, 1-99)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('0')
                        .setRequired(true)
                        .setMaxLength(2);
                    
                    modal.addComponents(new ActionRowBuilder().addComponents(input));
                    return await interaction.showModal(modal);
                }

                case 'rename': {
                    if (!isOwner) return await autoDeleteReply(interaction, '⛔ Hada mashi room dyalk! Ghir owner y9der ibdel smiya.');
                    
                    const modal = new ModalBuilder()
                        .setCustomId('rename_modal')
                        .setTitle('Rename Channel');
                    
                    const input = new TextInputBuilder()
                        .setCustomId('new_name')
                        .setLabel('Smit jdid dyal room:')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('My Awesome Room')
                        .setRequired(true)
                        .setMaxLength(100);
                    
                    modal.addComponents(new ActionRowBuilder().addComponents(input));
                    return await interaction.showModal(modal);
                }

                case 'chat_on': {
                    if (!isOwner) return await autoDeleteReply(interaction, '⛔ Hada mashi room dyalk! Ghir owner y9der ifette7 chat.');
                    
                    await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: true });
                    return await autoDeleteReply(interaction, '💬 Chat tfet7 b nja7! Daba kola wahed y9der yktéb.');
                }

                case 'chat_off': {
                    if (!isOwner) return await autoDeleteReply(interaction, '⛔ Hada mashi room dyalk! Ghir owner y9der isekk chat.');
                    
                    await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false });
                    return await autoDeleteReply(interaction, '🚫 Chat tsedd b nja7! Hta wahed ma y9der yktéb daba.');
                }

                case 'ban': {
                    if (!isOwner) return await autoDeleteReply(interaction, '⛔ Hada mashi room dyalk! Ghir owner y9der ibanni.');
                    
                    const members = voiceChannel.members.filter(m => m.id !== ownerId);
                    if (members.size === 0) {
                        return await autoDeleteReply(interaction, '❌ Makayen hta user f room bch tbannih!');
                    }

                    const row = new ActionRowBuilder().addComponents(
                        new UserSelectMenuBuilder()
                            .setCustomId('ban_user_select')
                            .setPlaceholder('Sélectionné user li bghiti tbannih')
                            .setMaxValues(1)
                    );
                    
                    return await interaction.reply({
                        content: '🚫 Sélectionné user li bghiti tbannih men room:',
                        components: [row],
                        ephemeral: true
                    });
                }

                case 'unban': {
                    if (!isOwner) return await autoDeleteReply(interaction, '⛔ Hada mashi room dyalk! Ghir owner y9der iunbanni.');
                    
                    const bannedOverwrites = voiceChannel.permissionOverwrites.cache.filter(
                        perm => perm.deny.has(PermissionsBitField.Flags.Connect) && perm.type === 1
                    );
                    
                    if (bannedOverwrites.size === 0) {
                        return await autoDeleteReply(interaction, '❌ Makayen hta user mbani f had room!');
                    }

                    const options = bannedOverwrites.map((perm, userId) => {
                        const member = interaction.guild.members.cache.get(userId);
                        return new StringSelectMenuOptionBuilder()
                            .setLabel(member?.displayName || userId)
                            .setValue(userId)
                            .setDescription(member ? 'Click bch t7iyed ban' : 'Unknown User');
                    }).slice(0, 25);

                    const row = new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('unban_user_select')
                            .setPlaceholder('Sélectionné user li bghiti t7iyed lban')
                            .addOptions(options)
                    );
                    
                    return await interaction.reply({
                        content: '✅ Sélectionné user li bghiti t7iyed lban:',
                        components: [row],
                        ephemeral: true
                    });
                }

                case 'kick': {
                    if (!isOwner) return await autoDeleteReply(interaction, '⛔ Hada mashi room dyalk! Ghir owner y9der ikicki.');
                    
                    const members = voiceChannel.members.filter(m => m.id !== ownerId);
                    if (members.size === 0) {
                        return await autoDeleteReply(interaction, '❌ Makayen hta user f room bch tkickih!');
                    }

                    const row = new ActionRowBuilder().addComponents(
                        new UserSelectMenuBuilder()
                            .setCustomId('kick_user_select')
                            .setPlaceholder('Sélectionné user li bghiti tkickih')
                    );
                    
                    return await interaction.reply({
                        content: '👢 Sélectionné user li bghiti tkickih men room:',
                        components: [row],
                        ephemeral: true
                    });
                }

                case 'claim': {
                    if (isOwner) {
                        return await autoDeleteReply(interaction, '⚠️ Nta déjà owner dyal had room!');
                    }
                    
                    if (!memberInRoom) {
                        return await autoDeleteReply(interaction, '❌ Khassak tkon f voice channel bch tclaimi ownership!');
                    }
                    
                    const currentOwnerInRoom = voiceChannel.members.has(ownerId);
                    if (currentOwnerInRoom) {
                        return await autoDeleteReply(interaction, '❌ Owner mazal kayn f room! Ma ymknch tclaimi daba.');
                    }

                    tempRooms.get(voiceChannelId).ownerId = interaction.user.id;
                    
                    await voiceChannel.permissionOverwrites.delete(ownerId).catch(() => {});
                    await voiceChannel.permissionOverwrites.edit(interaction.user.id, {
                        ManageChannels: true,
                        MuteMembers: true,
                        DeafenMembers: true,
                        MoveMembers: true,
                        ViewChannel: true
                    });
                    
                    await interaction.channel.permissionOverwrites.delete(ownerId).catch(() => {});
                    await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
                        ViewChannel: true,
                        SendMessages: true,
                        ReadMessageHistory: true
                    });

                    return await autoDeleteReply(interaction, '👑 Wlit owner dyal room b nja7! Daba nta lboss.');
                }

                case 'transfer': {
                    if (!isOwner) return await autoDeleteReply(interaction, '⛔ Hada mashi room dyalk! Ghir owner y9der isift ownership.');
                    
                    const members = voiceChannel.members.filter(m => m.id !== ownerId);
                    if (members.size === 0) {
                        return await autoDeleteReply(interaction, '❌ Makayen hta user f room bch t3tih ownership!');
                    }

                    const row = new ActionRowBuilder().addComponents(
                        new UserSelectMenuBuilder()
                            .setCustomId('transfer_user_select')
                            .setPlaceholder('Sélectionné new owner')
                    );
                    
                    return await interaction.reply({
                        content: '🔄 Sélectionné user li bghiti t3tih ownership:',
                        components: [row],
                        ephemeral: true
                    });
                }

                case 'invite': {
                    if (!memberInRoom) {
                        return await autoDeleteReply(interaction, '❌ Khassak tkon f room bch t3té invite!');
                    }

                    const row = new ActionRowBuilder().addComponents(
                        new UserSelectMenuBuilder()
                            .setCustomId('invite_user_select')
                            .setPlaceholder('Sélectionné user bch t3tih invite f DM')
                    );
                    
                    return await interaction.reply({
                        content: '📩 Sélectionné user li bghiti t3tih invite link f DM:',
                        components: [row],
                        ephemeral: true
                    });
                }
            }
        }

        // ==================== MODAL SUBMISSIONS ====================
        if (interaction.isModalSubmit()) {
            const roomInfo = getRoomDataByTextChannel(interaction.channel.id);
            if (!roomInfo) return;

            const { voiceChannelId } = roomInfo;
            const voiceChannel = interaction.guild.channels.cache.get(voiceChannelId);
            if (!voiceChannel) return;

            if (interaction.customId === 'limit_modal') {
                const value = interaction.fields.getTextInputValue('limit_value');
                const limit = parseInt(value);
                
                if (isNaN(limit) || limit < 0 || limit > 99) {
                    return await autoDeleteReply(interaction, '❌ Nombre mashi valid! Khass ykoun bin 0 o 99.');
                }

                await voiceChannel.setUserLimit(limit);
                return await autoDeleteReply(interaction, `👥 Limit tbaddel b nja7: **${limit === 0 ? 'Unlimited' : limit}** users.`);
            }

            if (interaction.customId === 'rename_modal') {
                const newName = interaction.fields.getTextInputValue('new_name');
                
                if (!newName || newName.length < 1 || newName.length > 100) {
                    return await autoDeleteReply(interaction, '❌ Smit channel mashi valid!');
                }

                await voiceChannel.setName(newName);
                return await autoDeleteReply(interaction, `✏️ Smit channel tbaddel b nja7: **${newName}**`);
            }
        }

        // ==================== USER SELECT MENUS ====================
        if (interaction.isUserSelectMenu()) {
            const roomInfo = getRoomDataByTextChannel(interaction.channel.id);
            if (!roomInfo) {
                return await autoDeleteUpdate(interaction, '❌ Hada mashi room dyalk!');
            }

            const { voiceChannelId, ownerId } = roomInfo;
            const voiceChannel = interaction.guild.channels.cache.get(voiceChannelId);
            if (!voiceChannel) {
                return await autoDeleteUpdate(interaction, '❌ Room ma kaynch!');
            }

            const targetId = interaction.values[0];
            const target = await interaction.guild.members.fetch(targetId).catch(() => null);
            
            if (!target) {
                return await autoDeleteUpdate(interaction, '❌ Ma qdertch nl9a had user!');
            }

            switch (interaction.customId) {
                case 'ban_user_select': {
                    await voiceChannel.permissionOverwrites.edit(targetId, { Connect: false });
                    
                    if (voiceChannel.members.has(targetId)) {
                        await target.voice.disconnect().catch(() => {});
                    }
                    
                    return await autoDeleteUpdate(interaction, `🚫 **${target.displayName}** tban men room! Ma y9derch ydkhel daba.`);
                }

                case 'kick_user_select': {
                    if (!voiceChannel.members.has(targetId)) {
                        return await autoDeleteUpdate(interaction, '❌ Had user ma kaynch f room daba!');
                    }
                    
                    await target.voice.disconnect();
                    return await autoDeleteUpdate(interaction, `👢 **${target.displayName}** tkicka men room!`);
                }

                case 'transfer_user_select': {
                    if (!voiceChannel.members.has(targetId)) {
                        return await autoDeleteUpdate(interaction, '❌ Khass user ykon f room bch t3tih ownership!');
                    }

                    tempRooms.get(voiceChannelId).ownerId = targetId;
                    
                    await voiceChannel.permissionOverwrites.delete(ownerId).catch(() => {});
                    await voiceChannel.permissionOverwrites.edit(targetId, {
                        ManageChannels: true,
                        MuteMembers: true,
                        DeafenMembers: true,
                        MoveMembers: true,
                        ViewChannel: true
                    });
                    
                    await interaction.channel.permissionOverwrites.delete(ownerId).catch(() => {});
                    await interaction.channel.permissionOverwrites.edit(targetId, {
                        ViewChannel: true,
                        SendMessages: true,
                        ReadMessageHistory: true
                    });

                    return await autoDeleteUpdate(interaction, `🔄 Ownership t3tet b nja7 l **${target.displayName}**! Daba howa lboss.`);
                }

                case 'invite_user_select': {
                    try {
                        const invite = await voiceChannel.createInvite({ maxAge: 3600, maxUses: 1, unique: true });
                        await target.send({
                            content: `📩 **${interaction.member.displayName}** 3tak invite l room: **${voiceChannel.name}**\n🔗 Link: ${invite.url}\n⏰ Expire f 1 sa3a.`,
                            components: [new ActionRowBuilder().addComponents(
                                new ButtonBuilder().setLabel('Join Room').setStyle(ButtonStyle.Link).setURL(invite.url)
                            )]
                        });
                        return await autoDeleteUpdate(interaction, `📩 Invite t3tet l **${target.displayName}** f DM!`);
                    } catch (error) {
                        return await autoDeleteUpdate(interaction, '❌ Ma qdertch n3tih DM! Ymkn DM dyalo msdoud.');
                    }
                }
            }
        }

        // ==================== STRING SELECT MENUS ====================
        if (interaction.isStringSelectMenu() && interaction.customId === 'unban_user_select') {
            const roomInfo = getRoomDataByTextChannel(interaction.channel.id);
            if (!roomInfo) {
                return await autoDeleteUpdate(interaction, '❌ Hada mashi room dyalk!');
            }

            const voiceChannel = interaction.guild.channels.cache.get(roomInfo.voiceChannelId);
            if (!voiceChannel) {
                return await autoDeleteUpdate(interaction, '❌ Room ma kaynch!');
            }

            const targetId = interaction.values[0];
            await voiceChannel.permissionOverwrites.delete(targetId);
            
            return await autoDeleteUpdate(interaction, '✅ User unbanni b nja7! Daba y9der ydkhel l room.');
        }

    } catch (error) {
        console.error('Interaction error:', error);
        try {
            if (interaction.replied || interaction.deferred) {
                await autoDeleteFollowUp(interaction, '❌ Chi haja khlat f system! Jareb merra okhra.');
            } else {
                await autoDeleteReply(interaction, '❌ Chi haja khlat f system! Jareb merra okhra.');
            }
        } catch {}
    }
});

// ==========================================
// ERROR HANDLING
// ==========================================
process.on('unhandledRejection', error => {
    console.error('Unhandled Rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught Exception:', error);
});

// Login
client.login(TOKEN);
