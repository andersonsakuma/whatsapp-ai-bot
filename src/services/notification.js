import axios from "axios";
import { config, logger } from "../config/index.js";
export async function notifyDecision({ decisionId, contact, question }) {
  if (!config.webhookUrl) return;
  try { await axios.post(config.webhookUrl, { event: "decision_needed", decisionId, contact, question }); }
  catch (err) { logger.warn({ err }, "Falha no webhook"); }
}
