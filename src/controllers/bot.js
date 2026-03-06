import { randomUUID } from "crypto";
import { analyzeMessage } from "../services/ai.js";
import { sendMessage } from "../services/whatsapp.js";
import { notifyDecision } from "../services/notification.js";
import { logger, config } from "../config/index.js";
import { io } from "../app.js";
import { getConv, setPending, clearPending, addDecision, resolveDecision, logAutoReply, store } from "../store/memory.js";
export async function processIncoming({ jid, text, contact }) {
  if (!store.botActive) { setPending(jid, text); return; }
  const conv = getConv(jid);
  const result = await analyzeMessage({ history: conv.messages.slice(-20), contact, newMessage: text });
  if (result.need_decision) {
    await handleDecisionNeeded({ jid, contact, result, originalText: text });
  } else if (result.confidence >= config.confidenceMin) {
    await handleAutoReply({ jid, contact, reply: result.reply, confidence: result.confidence });
  } else {
    await handleDecisionNeeded({ jid, contact, originalText: text, result: { need_decision: true, summary: `Confianca baixa (${result.confidence}%). Sugestao: "${result.reply}"`, question: "A resposta sugerida esta adequada?", options: [result.reply, "Responder manualmente", "Ignorar"] } });
  }
}
async function handleAutoReply({ jid, contact, reply, confidence }) {
  await sendMessage(jid, reply);
  clearPending(jid);
  logAutoReply(jid, contact, reply, confidence);
  io.emit("auto:reply", { jid, contact, reply, confidence, ts: new Date().toISOString() });
}
async function handleDecisionNeeded({ jid, contact, result, originalText }) {
  const decisionId = randomUUID();
  setPending(jid, originalText);
  addDecision(decisionId, { jid, contact, originalText, summary: result.summary, question: result.question, options: result.options });
  io.emit("decision:needed", { decisionId, jid, contact, summary: result.summary, question: result.question, options: result.options, ts: new Date().toISOString() });
  await notifyDecision({ decisionId, contact, question: result.question });
}
export async function resolveUserDecision({ decisionId, chosenReply }) {
  const decision = resolveDecision(decisionId);
  if (!decision) throw new Error(`Decisao ${decisionId} nao encontrada`);
  if (chosenReply === "__ignore__") { clearPending(decision.jid); io.emit("decision:resolved", { decisionId, action: "ignored" }); return; }
  await sendMessage(decision.jid, chosenReply);
  clearPending(decision.jid);
  logAutoReply(decision.jid, decision.contact, chosenReply, 100);
  io.emit("decision:resolved", { decisionId, jid: decision.jid, contact: decision.contact, reply: chosenReply, ts: new Date().toISOString() });
}
