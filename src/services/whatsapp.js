import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode";
import { config, logger } from "../config/index.js";
import { io } from "../app.js";
import { processIncoming } from "../controllers/bot.js";
import { getConv, pushMessage } from "../store/memory.js";
let sock = null;
export async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(config.sessionDir);
  const { version } = await fetchLatestBaileysVersion();
  sock = makeWASocket({ version, auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) }, printQRInTerminal: false, logger, browser: ["WhatsApp AI Bot", "Chrome", "1.0.0"] });
  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (qr) { const qrDataUrl = await qrcode.toDataURL(qr); global.__lastQR = qrDataUrl; logger.info("QR Code gerado!"); io.emit("qr", qrDataUrl); }
    if (connection === "open") { logger.info("WhatsApp conectado!"); io.emit("status", { connected: true }); }
    if (connection === "close") { const code = new Boom(lastDisconnect?.error)?.output?.statusCode; const shouldReconnect = code !== DisconnectReason.loggedOut; io.emit("status", { connected: false, code }); if (shouldReconnect) setTimeout(startWhatsApp, 5000); }
  });
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      if (msg.key.remoteJid?.endsWith("@g.us")) continue;
      const jid = msg.key.remoteJid;
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
      if (!text) continue;
      const pushName = msg.pushName || jid;
      const conv = getConv(jid);
      conv.contact = pushName;
      pushMessage(jid, "them", text);
      io.emit("message:incoming", { jid, contact: pushName, text, time: new Date().toISOString() });
      await processIncoming({ jid, text, contact: pushName });
    }
  });
  return sock;
}
export async function sendMessage(jid, text) {
  if (!sock) throw new Error("WhatsApp nao conectado");
  await sock.sendMessage(jid, { text });
  pushMessage(jid, "me", text);
}
