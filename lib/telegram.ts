import "server-only";

export interface TelegramBookingData {
  whenText: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  sector?: string;
  ad_spend?: string;
  website?: string;
  notes?: string;
}

export interface TelegramAuditData {
  name: string;
  company: string;
  email: string;
  phone?: string;
  sector?: string;
  ad_spend?: string;
  website?: string;
  message?: string;
  notes?: string;
}

function escapeHtml(str: string = ""): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Envía un mensaje instantáneo a un chat o canal de Telegram mediante Bot API.
 * Requiere TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID.
 * Si las variables no están configuradas, finaliza silenciosamente (false) sin bloquear el flujo.
 */
export async function sendTelegramMessage(htmlText: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!token || !chatId) {
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: htmlText,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      // Evita congelar la petición del usuario si la API de Telegram tarda
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn("[Telegram] Error en envío:", res.status, err);
      return false;
    }

    return true;
  } catch (err) {
    console.warn("[Telegram] Excepción enviando notificación:", err);
    return false;
  }
}

/**
 * Alerta inmediata de nueva llamada de conversión reservada (20 minutos)
 */
export async function notifyBookingTelegram(b: TelegramBookingData): Promise<boolean> {
  const lines = [
    `🚨 <b>NUEVA LLAMADA RESERVADA (20 MIN)</b>`,
    ``,
    `📅 <b>Cuándo:</b> ${escapeHtml(b.whenText)}`,
    `👤 <b>Nombre:</b> ${escapeHtml(b.name)}`,
    `🏢 <b>Empresa:</b> ${escapeHtml(b.company)}`,
    `📞 <b>Teléfono:</b> <a href="tel:${escapeHtml(b.phone)}">${escapeHtml(b.phone)}</a>`,
    `✉️ <b>Email:</b> <a href="mailto:${escapeHtml(b.email)}">${escapeHtml(b.email)}</a>`,
    b.sector ? `💼 <b>Sector:</b> ${escapeHtml(b.sector)}` : "",
    b.ad_spend ? `💰 <b>Inversión Ads:</b> ${escapeHtml(b.ad_spend)}` : "",
    b.website ? `🌐 <b>Web:</b> ${escapeHtml(b.website)}` : "",
    b.notes ? `📝 <b>Qué quiere resolver:</b>\n<i>${escapeHtml(b.notes)}</i>` : "",
  ].filter(Boolean);

  return sendTelegramMessage(lines.join("\n"));
}

/**
 * Alerta inmediata de nueva solicitud de auditoría recibida en la web
 */
export async function notifyAuditTelegram(a: TelegramAuditData): Promise<boolean> {
  const content = a.message || a.notes;
  const lines = [
    `🎯 <b>NUEVA SOLICITUD DE MES DE PRUEBA / AUDITORÍA</b>`,
    ``,
    `👤 <b>Nombre:</b> ${escapeHtml(a.name)}`,
    `🏢 <b>Empresa:</b> ${escapeHtml(a.company)}`,
    a.phone
      ? `📞 <b>Teléfono:</b> <a href="tel:${escapeHtml(a.phone)}">${escapeHtml(a.phone)}</a>`
      : `📞 <b>Teléfono:</b> <i>No indicado</i>`,
    `✉️ <b>Email:</b> <a href="mailto:${escapeHtml(a.email)}">${escapeHtml(a.email)}</a>`,
    a.sector ? `💼 <b>Sector:</b> ${escapeHtml(a.sector)}` : "",
    a.ad_spend ? `💰 <b>Inversión Ads:</b> ${escapeHtml(a.ad_spend)}` : "",
    a.website ? `🌐 <b>Web:</b> ${escapeHtml(a.website)}` : "",
    content ? `📝 <b>Mensaje:</b>\n<i>${escapeHtml(content)}</i>` : "",
  ].filter(Boolean);

  return sendTelegramMessage(lines.join("\n"));
}
