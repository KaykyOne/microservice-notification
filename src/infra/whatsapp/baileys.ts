import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import qrCodeGerator from 'qrcode-terminal';
import pino from 'pino';
import * as fs from 'fs/promises';
import { createRequire } from 'module';
import { logger } from '../../logs/logger.js';
// import { send } from '../../services/email.service.ts';

const require = createRequire(import.meta.url);
const QRCode = require('qrcode-terminal/vendor/QRCode');

const SESSION_PATH = './sessions/whatsapp-baileys';
const TEMPO_ENTRE_MENSAGENS = 20000;
const MAX_RESTART_ATTEMPTS = 4;
const RESTART_DELAY_MS = 5000;

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
let startPromise = null;
let socketGeneration = 0;

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

function getDisconnectInfo(lastDisconnect) {
    const error = lastDisconnect?.error;
    const statusCode = error?.output?.statusCode;
    const reason = error?.output?.payload?.message
        || error?.message
        || String(statusCode ?? 'unknown');
    const reasonName = Object.entries(DisconnectReason)
        .find(([, value]) => value === statusCode)?.[0]
        || 'unknown';

    return { statusCode, reason, reasonName };
}

function removeSocketListeners(targetSock) {
    targetSock?.ev?.removeAllListeners?.('connection.update');
    targetSock?.ev?.removeAllListeners?.('messages.upsert');
    targetSock?.ev?.removeAllListeners?.('creds.update');
}

async function cleanupSocket(reason = 'cleanup', options = { close: true }) {
    const targetSock = sock;

    if (!targetSock) {
        return;
    }

    removeSocketListeners(targetSock);

    if (options.close) {
        try {
            const ws = targetSock.ws;
            if (ws && !ws.isClosed && !ws.isClosing) {
                await ws.close();
            }
        } catch (error) {
            logger.error(`Erro ao fechar socket Baileys durante ${reason}: ${error.message}`);
        }
    }

    if (sock === targetSock) {
        sock = null;
    }
}

function safeBuildQrMatrix(qr) {
    try {
        return buildQrMatrix(qr);
    } catch (error) {
        logger.error(`Erro ao montar matriz do QR Code: ${error.message}`);
        return null;
    }
}

async function startSession() {
    socketGeneration++;
    await cleanupSocket('inicio de nova sessao');

    const { state: authState, saveCreds } = await useMultiFileAuthState(SESSION_PATH);

    const currentGeneration = socketGeneration;
    const currentSock = makeWASocket({
        version,
        printQRInTerminal: false,
        logger: pino({ level: 'error' }),
        auth: authState
    });

    sock = currentSock;
    currentSock.ev.on('creds.update', saveCreds);
    registerSocketEvents(currentSock, currentGeneration);
    console.log(`[Baileys] Sessao iniciada. socketGeneration=${currentGeneration}`);
}

function scheduleRestart(nextAttempt, statusCode, reason) {
    if (reinicioProgramado) {
        console.log(`[Baileys] Reinicio ja programado. statusCode=${statusCode ?? 'unknown'} reason=${reason} tentativa=${nextAttempt}/${MAX_RESTART_ATTEMPTS}`);
        return;
    }

    reinicioProgramado = setTimeout(() => {
        reinicioProgramado = null;
        startBot(nextAttempt).catch((error) => {
            logger.error('Erro ao reiniciar bot: ' + error.message);
        });
    }, RESTART_DELAY_MS);
}

function registerSocketEvents(currentSock, currentGeneration) {
    currentSock.ev.on('connection.update', async (update) => {
        if (currentSock !== sock || currentGeneration !== socketGeneration) {
            logger.info(`[Baileys] Ignorando connection.update de socket antigo. socketGeneration=${currentGeneration} activeGeneration=${socketGeneration}`);
            return;
        }

        console.log('connection.update RAW:', JSON.stringify(update));
        const { connection, lastDisconnect, qr, isNewLogin } = update;

        if (isNewLogin) {
            console.log('[Baileys] isNewLogin detectado; mantendo o socket atual sem reiniciar.');
        }


        if (qr) {
            qrCodeGerator.generate(qr, { small: true });
            setState({
                inicializando: false,
                autenticado: false,
                conectado: false,
                ultimoQr: qr,
                qrMatrix: safeBuildQrMatrix(qr),
                status: 'qr'
            });
        }

        if (connection === 'open') {
            console.log('[Baileys] Conectado com sucesso.');
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

            const { statusCode, reason, reasonName } = getDisconnectInfo(lastDisconnect);
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            removeSocketListeners(currentSock);
            if (sock === currentSock) {
                sock = null;
            }

            setState({
                iniciado: false,
                inicializando: false,
                autenticado: false,
                conectado: false,
                status: shouldReconnect ? 'restarting' : 'stopped',
                ultimaRazaoDesconexao: reason
            });

            console.log(`[Baileys] Conexao fechada. statusCode=${statusCode ?? 'unknown'} reason=${reasonName}:${reason} tentativaAtual=${tentativasReinicio}/${MAX_RESTART_ATTEMPTS}`);

            if (shouldReconnect && tentativasReinicio < MAX_RESTART_ATTEMPTS) {
                tentativasReinicio++;
                console.log(`[Baileys] Agendando reinicio ${tentativasReinicio}/${MAX_RESTART_ATTEMPTS} em ${RESTART_DELAY_MS}ms. statusCode=${statusCode ?? 'unknown'} reason=${reason}`);
                setState({ inicializando: true });
                scheduleRestart(tentativasReinicio, statusCode, reason);
                return;
            }

            clearRestartTimer();

            // if (emailWarning) {
            //     await send('Logout detectado, reinício do bot falhou após 4 tentativas. Verifique a sessão do WhatsApp.', emailWarning);
            // }

            const finalReason = statusCode === DisconnectReason.loggedOut
                ? 'loggedOut'
                : `falha apos ${MAX_RESTART_ATTEMPTS} tentativas`;
            console.log(`[Baileys] Encerrando reconexao: ${finalReason}. statusCode=${statusCode ?? 'unknown'} reason=${reasonName}:${reason}`);
            logger.error(`[Baileys] Reconexao encerrada: ${finalReason}. statusCode=${statusCode ?? 'unknown'} reason=${reasonName}:${reason}`);

            await fs.rm(SESSION_PATH, { recursive: true, force: true });
            resetConnectionState('stopped');
            setState({
                ultimaRazaoDesconexao: reason
            });
        }
    });

    currentSock.ev.on('messages.upsert', ({ messages, type }) => {
        if (currentSock !== sock || currentGeneration !== socketGeneration) {
            return;
        }

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
    if (startPromise) {
        await startPromise;
        return getBotStatus();
    }

    if (state.iniciado || state.conectado) {
        return getBotStatus();
    }

    clearRestartTimer();
    tentativasReinicio = tentativasReinicioParam;

    startPromise = (async () => {
        setState({
            inicializando: true,
            status: 'starting',
            ultimaRazaoDesconexao: null
        });

        await startSession();

        console.log('Bot iniciado com Baileys');
        return getBotStatus();
    })();

    try {
        return await startPromise;
    } finally {
        startPromise = null;
    }
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
        socketGeneration++;

        if (sock) {
            await cleanupSocket('destruicao manual');
            console.log('Sessao destruida');
        } else {
            encerrandoManual = false;
        }

        encerrandoManual = false;
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
