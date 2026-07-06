//* Config Imports
import config, { setBotWhatsappStarted } from "../config.js";

setBotWhatsappStarted(!config.whatsappStatus)

console.log(`Bot Whatsapp Status: ${config.whatsappStatus ? "Started" : "Stopped"}`);
