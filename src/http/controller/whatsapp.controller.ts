
//* Services Imports
import {
    sendMessageService,
} from "../services/whatsapp.service.js";

//* Util Imports
import { logger } from "../../utils/logger.js";

//* Schema Imports
import { Message } from "../../schemas/message.js";

async function sendMessage(req, res) {
    const message: Message = req.body;

    if (!message.text || !message.phone) {
        return res.status(400).json({ message: "As propriedades text ou phone nao foram encontradas!" });
    }

    logger.info(`Recebida requisicao para enviar mensagem para ${message.phone}`);
    try {
        await sendMessageService(message);
        return res.status(200).json({ message: "Mensagem enviada com sucesso!" });
    } catch (error) {
        return res.status(500).json({
            message: "Erro ao enviar mensagem",
            error: error.message
        });
    }
}

export {
    sendMessage,
};
