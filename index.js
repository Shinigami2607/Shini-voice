const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
require('dotenv').config(); // هادي باش يقرأ الـ Token من الاستضافة

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates, // ضروري لرومات الصوت
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// خزنة الأوامر
client.commands = new Collection();

// 1. تحميل الأوامر (Commands)
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
    console.log(`Command Loaded: ${file} ✅`);
}

// 2. تحميل الأحداث (Events)
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
    console.log(`Event Loaded: ${file} 🔔`);
}

// تشغيل البوت باستخدام الـ Token من الاستضافة
client.login(process.env.DISCORD_TOKEN);
