//* Whatsapp Imports
import baileys from "./whatsapp/baileys.js";

//* Email Imports
import transporter from "./email/email.js";

const whatsapp = baileys;
const email = transporter;

whatsapp.startBot();

export { whatsapp, email };
