//* Prisma Imports
import { prismaManager } from "../../../prisma/prisma.js";

//* Infra Imports
import { whatsapp } from "../../infra/index.js";

//* Common Imports
import { tempoHumano, iniciadorAleatorio } from "../../common/humanization.js";
import { formatNumber, clearNumber } from "../../common/number.js";

//* Util Imports
import { logger } from "../../utils/logger.js";

//* Schema Imports
import { Message } from "../../schemas/message.js";

const { startBot, enviarMensagem, state, getBotStatus } = whatsapp;

let enviando = false;

async function sendMessageService(message: Message) {
    
    const numeroFormatado = formatNumber(message.phone);
    const dataFormatada = message.forAt ? new Date(message.forAt) : null;

    try {

        if (dataFormatada) {
            await prismaManager.message.create({
                data: {
                    text: message.text,
                    phone: numeroFormatado,
                    status: 'SCHEDULED',
                    webhook: message.webhook || null,
                    type: 'WHATSAPP',
                    forAt: dataFormatada
                }
            });
            logger.info(`Mensagem agendada para ${numeroFormatado} com sucesso.`);

        } else {
            await prismaManager.message.create({
                data: {
                    text: message.text,
                    phone: numeroFormatado,
                    status: 'PENDING',
                    webhook: message.webhook || null,
                    type: 'WHATSAPP'
                }
            });
            logger.info(`Mensagem enviada para ${numeroFormatado} com sucesso.`);
        }


    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        logger.error(`Erro ao enviar mensagem para ${message.phone}: ${error.message}`);
        throw new Error('Falha ao enviar mensagem');
    }
};

async function updateStatus(id, status) {
    await prismaManager.message.update({
        where: { id },
        data: { status }
    });
};

async function seeBD() {
    // console.log(enviando);
    // console.log(state.iniciado);

    if (enviando) return;
    if (!state.iniciado) return;
    console.log('Verificando mensagens pendentes...');
    // console.log('Verificando mensagens pendentes...');
    try {
        enviando = true;
        const messagesPendentes = await prismaManager.message.findMany({
            where: {
                status: 'PENDING'
            }
        });
        // console.log(messagesPendentes);

        const messagesAgendadas = await prismaManager.message.findMany({
            where: {
                status: 'SCHEDULED',
                forAt: { lte: new Date() }
            },
            take: 5,
            orderBy: {
                forAt: 'asc'
            }
        });

        const messages = [...messagesPendentes, ...messagesAgendadas];
        // console.log(messages);

        if (messages.length === 0) {
            enviando = false;
            return;
        }
        console.log(`Encontradas ${messages.length} mensagens pendentes.`);
        for (const message of messages) {
            await enviarMensagem(iniciadorAleatorio(), message.phone);
            await new Promise(r => setTimeout(r, 2000)); // Espera 2 segundos antes de atualizar o status para 'SENT'
            await enviarMensagem(`${message.text}`, message.phone);
            await updateStatus(message.id, 'SENT');
            logger.info(`Mensagem ID ${message.id} enviada com sucesso para ${message.phone}`);

            const delay = tempoHumano();
            await new Promise(r => setTimeout(r, delay));
        }
    } catch (error) {
        logger.error(`Erro ao processar mensagens pendentes: ${error.message}`);
    } finally {
        enviando = false;
    }
};

async function start() {
    await startBot();
    console.log('Bot do WhatsApp iniciado.');
    return getBotStatus();
};

async function sendToWebhook(message, number) {
    console.log('Verificando webhooks para o número:', number);

    const webhooksForNumber = await prismaManager.message.findMany({
        where: {
            phone: number,
            webhookSent: false,
            webhook: { not: null }
        },
        select: {
            id: true,
            webhook: true
        }
    });

    message.number = clearNumber(number);

    console.log(`Encontrados ${webhooksForNumber.length} webhooks para o número ${number}.`);

    for (const webhook of webhooksForNumber) {
        if (!webhook.webhook) continue;
        try {
            await fetch(webhook.webhook, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(message)
            });

            await prismaManager.message.update({
                where: {
                    id: webhook.id
                },
                data: {
                    webhookSent: true,
                    webhookSentAt: new Date()
                }
            });
        } catch (error) {
            logger.error(`Erro ao enviar mensagem para webhook ${webhook.webhook}: ${error.message}`);
        }
    }

}

setInterval(seeBD, 10000);

export {
    sendMessageService,
    start,
    sendToWebhook
};
