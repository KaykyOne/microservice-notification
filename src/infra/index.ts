import { startBot, enviarMensagem, normalizeWhatsAppNumber, destruirSessao, state, getBotStatus } from "./whatsapp/baileys.js";

import transporter from "./email/email.js";

const whatsapp = { startBot, enviarMensagem, normalizeWhatsAppNumber, destruirSessao, state, getBotStatus };
const email = transporter;

export { whatsapp, email };
