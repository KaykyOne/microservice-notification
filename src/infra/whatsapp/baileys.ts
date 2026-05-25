import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import qrCodeGerator from 'qrcode-terminal';
import pino from 'pino';
import * as fs from 'fs/promises';
import { createRequire } from 'module';
import { logger } from '../../logs/logger.ts';
import { send } from '../../services/email.service.ts';

const require = createRequire(import.meta.url);
const QRCode = require('qrcode-terminal/vendor/QRCode');

const SESSION_PATH = './sessions/whatsapp-baileys';
const TEMPO_ENTRE_MENSAGENS = 20000;

const state = {
    iniciado: false,
    inicializando: false,
    autenticado: false,
    conectado: false,
    ultimoQr: null,
    qrMatrix: null,
    status: 'idle',
    ultimaRazaoDesconexao: null
};

let sock = null;
let tentativasReinicio = 0;
let reinicioProgramado = null;
let encerrandoManual = false;

const { version } = await fetchLatestBaileysVersion();

process.on('unhandledRejection', (reason) => {
    logger.error(reason);
});
process.on('uncaughtException', (error) => {
    logger.error(error);
});

const emailWarning = process.env.EMAIL_WARNING;

function setState(partialState) {
    Object.assign(state, partialState);
}

function resetConnectionState(nextStatus = 'idle') {
    setState({
        iniciado: false,
        inicializando: false,
        autenticado: false,
        conectado: false,
        ultimoQr: null,
        qrMatrix: null,
        status: nextStatus
    });
}

function buildQrMatrix(qr) {
    const qrcode = new QRCode(-1, 'L');
    qrcode.addData(qr);
    qrcode.make();
    return qrcode.modules.map((row) => row.map(Boolean));
}

function getBotStatus() {
    return {
        iniciado: state.iniciado,
        inicializando: state.inicializando,
        autenticado: state.autenticado,
        conectado: state.conectado,
        status: state.status,
        ultimoQr: state.ultimoQr,
        qrMatrix: state.qrMatrix,
        ultimaRazaoDesconexao: state.ultimaRazaoDesconexao
    };
}

function clearRestartTimer() {
    if (reinicioProgramado) {
        clearTimeout(reinicioProgramado);
        reinicioProgramado = null;
    }
}

async function startSession() {
    const { state: authState, saveCreds } = await useMultiFileAuthState(SESSION_PATH);

    sock = makeWASocket({
        version,
        printQRInTerminal: false,
        logger: pino({ level: 'error' }),
        auth: authState
    });

    sock.ev.on('creds.update', saveCreds);
    registerSocketEvents();
    console.log('Sessão iniciada!');
}

function scheduleRestart(nextAttempt) {
    clearRestartTimer();
    reinicioProgramado = setTimeout(() => {
        startBot(nextAttempt).catch((error) => {
            logger.error('Erro ao reiniciar bot: ' + error.message);
        });
    }, 5000);
}

function registerSocketEvents() {
    sock.ev.on('connection.update', async (update) => {
        console.log('connection.update RAW:', JSON.stringify(update));
        const { connection, lastDisconnect, qr, isNewLogin } = update;

        if (isNewLogin) {
            console.log('🔑 Novo login detectado, reconectando...');
            sock = null;
            resetConnectionState('starting');
            await startSession();
            return;
        }


        if (qr) {
            qrCodeGerator.generate(qr, { small: true });
            setState({
                inicializando: false,
                autenticado: false,
                conectado: false,
                ultimoQr: qr,
                qrMatrix: buildQrMatrix(qr),
                status: 'qr'
            });
        }

        if (connection === 'open') {
            console.log('✅ Conectado com sucesso!');
            tentativasReinicio = 0;
            setState({
                iniciado: true,
                inicializando: false,
                autenticado: true,
                conectado: true,
                ultimoQr: null,
                qrMatrix: null,
                status: 'ready',
                ultimaRazaoDesconexao: null
            });
        }

        if (connection === 'close') {
            if (encerrandoManual) {
                encerrandoManual = false;
                sock = null;
                clearRestartTimer();
                resetConnectionState('stopped');
                setState({
                    ultimaRazaoDesconexao: null
                });
                return;
            }

            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            const reason = lastDisconnect?.error?.message || String(statusCode ?? 'unknown');

            setState({
                iniciado: false,
                inicializando: false,
                autenticado: false,
                conectado: false,
                status: shouldReconnect ? 'restarting' : 'stopped',
                ultimaRazaoDesconexao: reason
            });

            console.log('❌ Conexão fechada, tentando reconectar...');

            if (shouldReconnect && tentativasReinicio < 4) {
                tentativasReinicio++;
                console.log(`🔄 Tentativa de reinício ${tentativasReinicio}/4`);
                setState({ inicializando: true });
                scheduleRestart(tentativasReinicio);
                return;
            }

            clearRestartTimer();
            console.log('🚫 Logout detectado, não será possível reconectar.');
            logger.error('Logout detectado, reinício do bot falhou após 4 tentativas. Verifique a sessão do WhatsApp.');

            if (emailWarning) {
                await send('Logout detectado, reinício do bot falhou após 4 tentativas. Verifique a sessão do WhatsApp.', emailWarning);
            }

            await fs.rm(SESSION_PATH, { recursive: true, force: true });
            console.clear();
        }
    });

    sock.ev.on('messages.upsert', ({ messages, type }) => {
        if (type !== 'notify') {
            return;
        }

        for (const message of messages) {
            const from = message?.key?.remoteJid;
            const text = message?.message?.conversation
                || message?.message?.extendedTextMessage?.text
                || '';

            if (from && text) {
                console.log(`Mensagem recebida de ${from}: ${text}`);
            }
        }
    });
}

async function startBot(tentativasReinicioParam = 0) {
    if (state.inicializando || state.iniciado) {
        return getBotStatus();
    }

    clearRestartTimer();
    tentativasReinicio = tentativasReinicioParam;

    setState({
        inicializando: true,
        status: 'starting',
        ultimaRazaoDesconexao: null
    });

    await startSession();

    console.log('Bot iniciado com Baileys');
    return getBotStatus();
}

async function normalizeWhatsAppNumber(phone) {
    let clean = phone.replace(/\D/g, '');
    if (!clean.startsWith('55')) clean = '55' + clean;

    const with9 = clean.length === 12
        ? clean.slice(0, 4) + '9' + clean.slice(4)
        : clean;

    const without9 = with9.replace(/^(\d{4})9/, '$1');

    return { com9: with9, sem9: without9 };
}

async function enviarMensagem(texto, numero) {
    console.log(`Enviando mensagem para ${numero}`);

    if (!sock || !state.iniciado) {
        console.log('Cliente nao esta conectado');
        logger.error('Tentativa de envio quando cliente nao estava conectado');
        return false;
    }

    const { com9, sem9 } = await normalizeWhatsAppNumber(numero);
    if (!com9 && !sem9) {
        console.log(`Numero invalido: ${numero}`);
        return false;
    }

    for (const n of [com9, sem9]) {
        if (!n) continue;

        const jid = `${n}@s.whatsapp.net`;

        try {
            await sock.sendPresenceUpdate('composing', jid);
            await new Promise((resolve) => setTimeout(resolve, 1500));
            await sock.sendMessage(jid, { text: texto });
            await sock.sendPresenceUpdate('paused', jid);
            console.log(`Mensagem enviada para ${numero}`);
            logger.info(`Mensagem enviada para ${numero}`);
            return true;
        } catch (err) {
            console.log(`❌ Falhou com ${jid}, tentando outro formato...`);
            logger.error(`Erro ao enviar mensagem para ${jid}: ${err.message}`);
        }
    }

    return false;
}

async function destruirSessao() {
    try {
        clearRestartTimer();
        tentativasReinicio = 0;
        encerrandoManual = true;

        if (sock) {
            try {
                if (!sock.ws.isClosed && !sock.ws.isClosing) {
                    await sock.ws.close();
                }
            } catch (logoutError) {
                logger.error('Erro ao encerrar sessao do Baileys: ' + logoutError.message);
            }

            sock = null;
            console.log('Sessao destruida');
        } else {
            encerrandoManual = false;
        }

        resetConnectionState('stopped');
        setState({
            ultimaRazaoDesconexao: null
        });
    } catch (err) {
        console.error('Erro ao destruir sessao:', err);
        logger.error('Erro ao destruir sessao: ' + err.message);
        throw err;
    }
}

export { startBot, enviarMensagem, normalizeWhatsAppNumber, destruirSessao, TEMPO_ENTRE_MENSAGENS, state, getBotStatus };
