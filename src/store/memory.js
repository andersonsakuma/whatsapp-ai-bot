export const store = { conversations: new Map(), decisionQueue: new Map(), autoLog: [], botActive: true };
export function getConv(jid) { if (!store.conversations.has(jid)) store.conversations.set(jid, { jid, contact: jid, messages: [], pending: null }); return store.conversations.get(jid); }
export function pushMessage(jid, from, text) { const conv = getConv(jid); conv.messages.push({ from, text, time: new Date().toISOString() }); if (conv.messages.length > 30) conv.messages.shift(); }
export function setPending(jid, text) { getConv(jid).pending = { text, time: new Date().toISOString() }; }
export function clearPending(jid) { getConv(jid).pending = null; }
export function addDecision(id, payload) { store.decisionQueue.set(id, { ...payload, createdAt: new Date().toISOString() }); }
export function resolveDecision(id) { const d = store.decisionQueue.get(id); store.decisionQueue.delete(id); return d; }
export function logAutoReply(jid, contact, reply, confidence) { store.autoLog.unshift({ jid, contact, reply, confidence, ts: new Date().toISOString() }); if (store.autoLog.length > 100) store.autoLog.pop(); }
