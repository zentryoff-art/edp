import { NextResponse } from "next/server";
import { sendTelegramMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";

/**
 * Endpoint de diagnóstico para verificar la conexión de Telegram Bot API.
 * GET /api/telegram/test
 */
export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token) {
    return NextResponse.json(
      {
        ok: false,
        error: "Falta TELEGRAM_BOT_TOKEN en las variables de entorno de Vercel.",
      },
      { status: 400 }
    );
  }

  // 1. Verificar credenciales del Bot con getMe
  let botInfo: any = null;
  try {
    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    botInfo = await meRes.json();
    if (!botInfo.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "El TELEGRAM_BOT_TOKEN no es válido según Telegram.",
          telegram_response: botInfo,
        },
        { status: 400 }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "Error de red conectando con Telegram API", details: err.message },
      { status: 500 }
    );
  }

  // 2. Consultar getUpdates para ver los chats detectados
  let detectedChats: Array<{ id: number; title?: string; type: string; username?: string }> = [];
  try {
    const updatesRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
    const updatesJson = await updatesRes.json();
    if (updatesJson.ok && Array.isArray(updatesJson.result)) {
      const seen = new Set<number>();
      for (const u of updatesJson.result) {
        const chat = u.message?.chat || u.channel_post?.chat || u.my_chat_member?.chat;
        if (chat && !seen.has(chat.id)) {
          seen.add(chat.id);
          detectedChats.push({
            id: chat.id,
            title: chat.title || chat.first_name,
            type: chat.type,
            username: chat.username,
          });
        }
      }
    }
  } catch {}

  // 3. Probar envío al TELEGRAM_CHAT_ID configurado
  if (!chatId) {
    return NextResponse.json({
      ok: false,
      bot: botInfo.result,
      error: "Falta TELEGRAM_CHAT_ID en variables de entorno.",
      chats_detectados_en_getUpdates: detectedChats,
    });
  }

  const testPayload = {
    chat_id: chatId.trim(),
    text: `✅ <b>Conexión Exitosa</b>\n\nEl bot <b>@${botInfo.result?.username}</b> está correctamente conectado con Estudio Digital Pro. A partir de ahora recibirás aquí cada nueva llamada reservada y solicitud de auditoría.`,
    parse_mode: "HTML",
  };

  try {
    const sendRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testPayload),
    });

    const sendJson = await sendRes.json();

    if (!sendJson.ok) {
      return NextResponse.json(
        {
          ok: false,
          bot: {
            id: botInfo.result?.id,
            username: botInfo.result?.username,
            name: botInfo.result?.first_name,
          },
          chat_id_configurado: chatId,
          error: sendJson.description,
          diagnostico:
            sendJson.description === "Bad Request: chat not found"
              ? `El bot @${botInfo.result?.username} aún NO ha sido añadido como Administrador a ese canal/grupo o el Chat ID no coincide. Asegúrate de: 1) Abrir tu canal en Telegram, 2) Ir a Administradores -> Añadir Administrador -> Buscar @${botInfo.result?.username}, 3) Escribir un mensaje en el canal y volver a cargar esta página para ver el Chat ID detectado.`
              : sendJson.description,
          chats_detectados_en_getUpdates: detectedChats,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      mensaje: "¡Notificación de prueba enviada con éxito a Telegram!",
      bot: botInfo.result?.username,
      chat_id: chatId,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
