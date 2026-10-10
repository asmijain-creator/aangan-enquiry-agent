import { config } from "./config.js";

async function tg(method, body) {
  const r = await fetch(`https://api.telegram.org/bot${config.telegramToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!j.ok) throw new Error(`Telegram ${method}: ${j.description}`);
  return j.result;
}

export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function sendMessage(text, buttons) {
  return tg("sendMessage", {
    chat_id: config.telegramGroupId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: buttons ? { inline_keyboard: buttons } : undefined,
  });
}

export function editMessage(chatId, messageId, text, buttons) {
  return tg("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: { inline_keyboard: buttons || [] },
  });
}

export function answerButton(callbackQueryId, text) {
  return tg("answerCallbackQuery", { callback_query_id: callbackQueryId, text });
}

export function setWebhook(url, secret) {
  return tg("setWebhook", { url, secret_token: secret, allowed_updates: ["callback_query"] });
}
