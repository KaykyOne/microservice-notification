
//* Services Imports
import {
    sendMessageService,
} from "../services/whatsapp.service.js";

//* Util Imports
import { logger } from "../../utils/logger.js";

//* Schema Imports
import { messageSchema } from "../../schemas/message.js";

//* Type Imports
import type { Request, Response } from "express";
import type { Message } from "../../schemas/message.js";

const messageSchemaReceived = messageSchema.omit({ id: true, createdAt: true, webhookSent: true, webhookSentAt: true });

async function sendMessage(req: Request, res: Response) {
    const message: Message = req.body;
    message.type = "WHATSAPP";
    const parse = messageSchemaReceived.safeParse(message);

    if (!parse.success) {
        return res.status(400).json({ message: parse.error });
    }

    logger.info(`Recebida requisicao para enviar mensagem para ${message.phone}`);
    try {
        await sendMessageService(message);
        return res.status(200).json({ message: "Mensagem enviada com sucesso!" });
    } catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({
                message: "Erro ao enviar mensagem",
                error: error.message ? error.message : "Erro desconhecido",
            });
        }
    }
}

export {
    sendMessage,
};
