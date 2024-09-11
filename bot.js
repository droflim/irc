#!/usr/bin/env node

const fs = require('fs');
const irc = require('irc');

// Configuración del bot IRC
const bot = new irc.Client('66.175.239.80', 'nodebot', {
    channels: [], // No se une a canales por ahora
    port: 6900,
    secure: true,
    selfSigned: true
});

// Credenciales
const nsPassword = 'master123';
const osPassword = 'master123';

// Lista de nombres de bots
let botNames = [];
let bots = [];

// Leer nombres de bots desde el archivo names.txt
fs.readFile('names.txt', 'utf8', (err, data) => {
    if (err) {
        console.error('Error al leer names.txt:', err);
        process.exit(1);
    }
    
    botNames = data.split('\n').filter(name => name.trim() !== '').slice(0, 100);
    console.log('Nombres de bots leídos:', botNames);
});

// Evento de conexión del bot principal (nodebot)
bot.addListener('registered', () => {
    console.log('nodebot registrado y autenticado');

    // Conectarse como operador
    console.log('Conectándose como operador...');
    bot.send('oper', 'Killer', osPassword);

    // Esperar 10 segundos antes de identificarse con NickServ
    setTimeout(() => {
        console.log('Identificando con NickServ...');
        bot.send('ns', 'identify', nsPassword);
    }, 10000); // Espera de 10 segundos
});

// Listener para mensajes crudos
bot.addListener('raw', (message) => {
    try {
        console.log('Mensaje crudo recibido:', JSON.stringify(message, null, 2));

        // Procesar la respuesta de autenticación
        if (message.command === 'rpl_welcome') {
            console.log('Autenticación completada.');
            connectBots(); // Intentar conectar los bots a IRC
        }
    } catch (error) {
        console.error('Error no manejado:', error);
    }
});

// Listener para mensajes de error
bot.addListener('error', (message) => {
    console.error('Error:', message);
});

// Función para generar un host aleatorio
function generateRandomHost() {
    const randomHex = () => Math.floor(Math.random() * 0xFFFFF).toString(16).toUpperCase().padStart(8, '0');
    return `${randomHex()}.${randomHex()}.${randomHex()}.IP`;
}

// Función para conectar bots
function connectBots() {
    if (botNames.length === 0) {
        console.log('No hay bots para conectar.');
        return;
    }

    botNames.forEach((botName, index) => {
        setTimeout(() => {
            console.log(`Conectando el bot ${botName}`);
            const botClient = new irc.Client('66.175.239.80', botName, {
                channels: [], // No se une a canales por ahora
                port: 6900,
                secure: true,
                selfSigned: true
            });

            botClient.addListener('error', (message) => {
                console.error(`Error del bot ${botName}:`, message);
            });

            botClient.addListener('registered', () => {
                console.log(`Bot ${botName} registrado y autenticado.`);

                // Enviar comando CHGIDENT para cambiar la identidad
                const newIdent = 'kiwiirc';
                console.log(`Enviando comando CHGIDENT para el bot ${botName}`);
                bot.send('CHGIDENT', botName, newIdent);

                // Enviar comando CHGHOST para cambiar el host
                const newHost = generateRandomHost();
                console.log(`Enviando comando CHGHOST para el bot ${botName}`);
                bot.send('CHGHOST', botName, newHost);

                // Enviar comando CHGNAME para cambiar el realname
                console.log(`Enviando comando CHGNAME para el bot ${botName}`);
                bot.send('CHGNAME', botName, newIdent);

                // Enviar comando /SAJOIN para unirse a los canales
                console.log(`Enviando comando /SAJOIN para el bot ${botName}`);
                bot.send('SAJOIN', botName, '#lobby');
                bot.send('SAJOIN', botName, '#webcam');

                // Añadir el bot a la lista de bots para el seguimiento
                bots.push(botClient);
            });

        }, index * 10000); // Retraso de 10 segundos entre la conexión de cada bot
    });

    console.log('Proceso de conexión de bots iniciado.');

    // Iniciar el proceso de unirse a los canales después de que todos los bots estén conectados
    setTimeout(() => {
        startJoinProcess();
    }, botNames.length * 10000 + 30000); // Ajuste del tiempo total para permitir la conexión de todos los bots
}

// Función para procesar la unión a los canales
function startJoinProcess() {
    if (bots.length === 0) {
        console.log('No hay bots conectados para hacer sajoin.');
        return;
    }

    bots.forEach((botClient, index) => {
        setTimeout(() => {
            console.log(`El bot ${botClient.options.nick} está haciendo sajoin a los canales.`);
            botClient.send('join', '#lobby');
            botClient.send('join', '#webcam');
        }, index * 30000); // Retraso de 30 segundos entre la conexión de cada bot a los canales
    });

    console.log('Proceso de sajoin a los canales iniciado.');
}

// Manejo global de errores
process.on('uncaughtException', (error) => {
    console.error('Error no manejado en el proceso principal:', error);
});
