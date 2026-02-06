const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// البوت غيقرا المعلومات من الـ Host أو من ملف .env
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;

const commands = [];
const foldersPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(foldersPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(foldersPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
    }
}

const rest = new REST().setToken(token);

(async () => {
    try {
        console.log(`بدأ تفعيل ${commands.length} أمر لجميع السيرفرات...`);
        // هاد السطر هو لي كيخليه Global
        await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        );
        console.log(`✅ ناضي! الأوامر دابا خدامة فاع السيرفرات.`);
    } catch (error) {
        console.error(error);
    }
})();
