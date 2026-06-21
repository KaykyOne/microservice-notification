import crypto from 'crypto';
import { sendRootEmailService } from './email.service.js';
import { prismaManager } from "../../../prisma/prisma.js";
import { logger } from '../../../logs/logger.js';

async function generateKey() {
    try {
        const apiKey = crypto.randomBytes(32).toString('hex');
        const message = `Nova chave de API gerada: ${apiKey}`;
        await sendRootEmailService(message);
        if (apiKey && message) {
            const originName = process.env.ROOT_USER || 'root';
            const existingOrigin = await prismaManager.origin.findFirst({
                where: {
                    name: originName
                }
            });

            if (existingOrigin) {
                await prismaManager.origin.update({
                    where: {
                        id: existingOrigin.id
                    },
                    data: {
                        key: apiKey
                    }
                });
            } else {
                await prismaManager.origin.create({
                    data: {
                        name: originName,
                        webhook: '',
                        key: apiKey
                    }
                });
            }
        }
        return "Chave de API gerada e enviada para o administrador.";
    } catch (error) {
        logger.error(`Erro ao gerar chave de API: ${error.message}`);
        throw new Error("Erro ao gerar chave de API.");
    }
}

export { generateKey };
