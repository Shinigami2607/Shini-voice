import { Client, GatewayIntentBits, ChannelType, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, Events, Collection } from 'discord.js';
import http from 'http';

// السيرفر لضمان بقاء البوت شغال
http.createServer((req, res) => { res.write("Shini Voice PRO is Online!"); res.end(); }).listen(process.env.PORT || 3000);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildVoiceStates, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ]
});

// قاعدة بيانات مؤقتة (سيتم تحسينها مستقبلاً لتكون دائمة)
const activeChannels = new Map();
const setupConfig = new Map(); // لحفظ إعدادات القنوات والكاتيغوريز

client.once('ready', () => {
    console.log(`✅ ${client.user.tag} Is Ready! Version: V2 Pro`);
});

// --- 1. نظام الـ Setup (الأوامر) ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'setup') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
        
        const channelName = args.join(' ') || "Join to Create";
        const category = message.channel.parent;

        if (!category) return message.reply("❌ عافاك حط هاد الأمر فشي قناة داخل كاتيغوري!");

        const voiceChannel = await message.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildVoice,
            parent: category.id,
            permissionOverwrites: [
                { id: message.guild.id, allow: [PermissionsBitField.Flags.Connect] }
            ]
        });

        setupConfig.set(voiceChannel.id, { categoryId: category.id });
        message.reply(`✅ تم إنشاء قناة **${channelName}** بنجاح في كاتيغوري **${category.name}**`);
    }
});

// --- 2. نظام إنشاء الغرف وتحديث الواجهة ---
client.on('voiceStateUpdate', async (oldState, newState) => {
    // التحقق من قناة "Join to Create" (سواء المعرفة يدويا أو بالـ Setup)
    const isSetupChannel = setupConfig.has(newState.channelId) || newState.channel?.name === "Join to Create";

    if (isSetupChannel && !newState.member.user.bot) {
        const member = newState.member;
        const parentId = newState.channel.parentId;

        const channel = await newState.guild.channels.create({
            name: `🔊 ${member.user.username}'s Room`,
            type: ChannelType.GuildVoice,
            parent: parentId,
            permissionOverwrites: [
                { id: member.id, allow: [PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.MoveMembers, PermissionsBitField.Flags.Connect] },
                { id: newState.guild.id, allow: [PermissionsBitField.Flags.Connect] }
            ]
        });

        await member.voice.setChannel(channel);

        // إنشاء لوحة التحكم المتطورة
        const embed = createEmbed(member, 'Unlocked', 'No Limit');
        const rows = createButtons();

        const msg = await channel.send({ content: `<@${member.id}>`, embeds: [embed], components: rows });
        activeChannels.set(channel.id, { ownerId: member.id, msgId: msg.id, status: 'Unlocked', limit: 0 });
    }

    // --- 3. نظام التنظيف (Cleanup) ---
    // إذا غادر الجميع القناة
    if (oldState.channel && oldState.channel.members.size === 0) {
        // إذا كانت القناة مسجلة في البوت كقناة مؤقتة
        if (activeChannels.has(oldState.channel.id)) {
            await oldState.channel.delete().catch(() => {});
            activeChannels.delete(oldState.channel.id);
        } 
        // أو إذا كانت تبدأ بعلامة البوت ولم يتم مسحها (حل مشكلة القنوات العالقة)
        else if (oldState.channel.name.startsWith('🔊')) {
            await oldState.channel.delete().catch(() => {});
        }
    }
});

// --- 4. التعامل مع الأزرار والمودلز (V2) ---
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton() && !interaction.isModalSubmit() && !interaction.isStringSelectMenu()) return;

    const channel = interaction.channel;
    const roomInfo = activeChannels.get(interaction.channelId);

    // التحقق من الملكية (إلا زر الـ Claim)
    if (interaction.customId !== 'v_claim' && (!roomInfo || interaction.user.id !== roomInfo.ownerId)) {
        return interaction.reply({ content: "❌ هاد الروم ماشي ديالك أو ما عندكش صلاحية!", ephemeral: true });
    }

    // حل مشكلة Interaction Failed
    if (interaction.isButton()) await interaction.deferUpdate();

    try {
        switch (interaction.customId) {
            case 'v_lock':
                await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: false });
                roomInfo.status = 'Locked';
                updatePanel(interaction);
                break;

            case 'v_unlock':
                await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: true });
                roomInfo.status = 'Unlocked';
                updatePanel(interaction);
                break;

            case 'v_rename':
                const renameModal = new ModalBuilder().setCustomId('m_rename').setTitle('Rename Your Room');
                const nameInput = new TextInputBuilder().setCustomId('new_name').setLabel("New Name").setStyle(TextInputStyle.Short).setMaxLength(20);
                renameModal.addComponents(new ActionRowBuilder().addComponents(nameInput));
                await interaction.followUp({ components: [], content: 'Checking...', ephemeral: true }); // لفتح المودل بشكل صحيح
                return interaction.showModal(renameModal);

            case 'v_limit':
                const limitModal = new ModalBuilder().setCustomId('m_limit').setTitle('Set User Limit');
                const limitInput = new TextInputBuilder().setCustomId('user_limit').setLabel("Number (0-99)").setStyle(TextInputStyle.Short).setMaxLength(2);
                limitModal.addComponents(new ActionRowBuilder().addComponents(limitInput));
                return interaction.showModal(limitModal);

            case 'v_kick':
                // نفتح مودل لإدخال ID الشخص المراد طرده أو نستخدم قائمة المبرز
                await interaction.followUp({ content: "⚠️ الميزة قيد التطوير، استعمل الأمر `!kick` حالياً", ephemeral: true });
                break;
                
            case 'v_claim':
                if (channel.members.size > 0 && !channel.members.has(roomInfo.ownerId)) {
                    roomInfo.ownerId = interaction.user.id;
                    updatePanel(interaction);
                }
                break;
        }
    } catch (e) { console.error(e); }
});

// معالجة المودلز (Modals)
client.on(Events.InteractionCreate, async i => {
    if (!i.isModalSubmit()) return;
    const roomInfo = activeChannels.get(i.channelId);

    if (i.customId === 'm_rename') {
        const name = i.fields.getTextInputValue('new_name');
        await i.channel.setName(`🔊 ${name}`);
        await i.reply({ content: `✅ تم تغيير الاسم لـ: ${name}`, ephemeral: true });
    }

    if (i.customId === 'm_limit') {
        const limit = parseInt(i.fields.getTextInputValue('user_limit'));
        if (isNaN(limit) || limit < 0 || limit > 99) return i.reply({ content: "❌ رقم غير صحيح!", ephemeral: true });
        await i.channel.setUserLimit(limit);
        roomInfo.limit = limit === 0 ? 'No Limit' : limit;
        await i.reply({ content: `✅ تم تحديد العدد في: ${limit}`, ephemeral: true });
        updatePanel(i);
    }
});

// --- وظائف مساعدة (Helper Functions) ---

function createEmbed(member, status, limit) {
    return new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🎛️ Control Panel | Shini Voice')
        .setDescription('استخدم الأزرار أسفله للتحكم في غرفتك الخاصة')
        .addFields(
            { name: '👤 Owner', value: `<@${member.id}>`, inline: true },
            { name: '🔒 Status', value: status, inline: true },
            { name: '👥 Limit', value: `${limit}`, inline: true }
        )
        .setTimestamp();
}

function createButtons() {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('v_lock').setLabel('Lock').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('v_unlock').setLabel('Unlock').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('v_rename').setLabel('Rename').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('v_limit').setLabel('Limit').setStyle(ButtonStyle.Secondary)
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('v_kick').setLabel('Kick').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('v_block').setLabel('Block').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('v_claim').setLabel('Claim').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('v_delete').setLabel('Delete').setStyle(ButtonStyle.Danger)
    );
    return [row1, row2];
}

async function updatePanel(interaction) {
    const roomInfo = activeChannels.get(interaction.channelId);
    const owner = await interaction.guild.members.fetch(roomInfo.ownerId);
    const embed = createEmbed(owner, roomInfo.status, roomInfo.limit || 'No Limit');
    await interaction.editReply({ embeds: [embed] });
}

client.login(process.env.TOKEN);
