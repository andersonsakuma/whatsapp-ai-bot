import pino from "pino";
export const config = { groqKey: process.env.GROQ_API_KEY || "", webhookUrl: process.env.WEBHOOK_URL || "", botName: process.env.BOT_NAME || "Bot", ownerJid: process.env.OWNER_JID || "", sessionDir: process.env.SESSION_DIR || "./session", confidenceMin: Number(process.env.CONFIDENCE_MIN) || 70 };
export const logger = pino({ transport: { target: "pino-pretty", options: { colorize: true } } });
