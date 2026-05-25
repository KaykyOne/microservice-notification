import { startBot, enviarMensagem, normalizeWhatsAppNumber, destruirSessao, TEMPO_ENTRE_MENSAGENS, state, getBotStatus } from "./whatsapp/baileys.ts";

import transporter from "./email/email.ts";

const whatsapp = { startBot, enviarMensagem, normalizeWhatsAppNumber, destruirSessao, TEMPO_ENTRE_MENSAGENS, state, getBotStatus };
const email = transporter;

export { whatsapp, email };
