import { config, logger } from "../config/index.js";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const SYSTEM_PROMPT = `Voce e um assistente que responde mensagens de WhatsApp em nome do usuario. Responda de forma natural e concisa. Se exigir decisao critica (dinheiro, compromisso, dados pessoais), nao responda sozinho. Retorne APENAS JSON puro sem markdown: Se puder responder: {"need_decision": false, "reply": "texto", "confidence": 85} Se precisar de decisao: {"need_decision": true, "summary": "resumo", "question": "pergunta", "options": ["opcao A", "opcao B", "Ignorar"]}`;
export async function analyzeMessage({ history, contact, newMessage }) {
  const historyText = history.map(m => `${m.from === "me" ? "EU" : contact}: ${m.text}`).join("\n");
  const userPrompt = `Historico:\n${historyText}\n\nNova mensagem de ${contact}: "${newMessage}"\n\nComo devo responder?`;
  try {
    const response = await fetch(GROQ_API_URL, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${config.groqKey}` }, body: JSON.stringify({ model: "llama-3.3-70b-versatile", max_tokens: 512, temperature: 0.4, messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userPrompt }], response_format: { type: "json_object" } }) });
    if (!response.ok) throw new Error(`Groq error ${response.status}`);
    const data = await response.json();
    return JSON.parse(data.choices?.[0]?.message?.content || "{}");
  } catch (err) {
    logger.error({ err }, "Erro na API Groq");
    return { need_decision: true, summary: `Erro ao processar mensagem de ${contact}`, question: "Houve um erro na IA. Como deseja responder?", options: ["Ignorar por enquanto", "Me lembrar depois"] };
  }
}
