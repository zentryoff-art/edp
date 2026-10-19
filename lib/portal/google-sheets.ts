import "server-only";
import { google } from "googleapis";
import { getDb } from "../firebase/admin";
import type { Lead } from "./types";
import { JG_LSA_ACCOUNTS, JG_META_CAMPAIGNS } from "./types";
import { cap, fmt } from "./metrics";

let credentialDiag = "";

function getGoogleCredentials() {
  let rawJson = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON?.trim();
  let parseErr = "";

  if (rawJson) {
    // Si viene envuelto entre comillas simples o dobles al copiarlo del .env
    if (
      (rawJson.startsWith("'") && rawJson.endsWith("'")) ||
      (rawJson.startsWith('"') && rawJson.endsWith('"'))
    ) {
      rawJson = rawJson.slice(1, -1).trim();
    }
    try {
      const parsed = JSON.parse(rawJson);
      if (parsed.private_key) {
        parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
      }
      return parsed;
    } catch (e: any) {
      parseErr = e.message;
      console.warn("[google-sheets] Error parsing GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON:", e.message);
    }
  }

  const projectId = process.env.GOOGLE_SHEETS_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

  if (clientEmail && privateKey) {
    // Limpiar comillas si las tuviera
    if (
      (privateKey.startsWith("'") && privateKey.endsWith("'")) ||
      (privateKey.startsWith('"') && privateKey.endsWith('"'))
    ) {
      privateKey = privateKey.slice(1, -1).trim();
    }
    privateKey = privateKey.replace(/\\n/g, "\n");
    return {
      project_id: projectId,
      client_email: clientEmail.replace(/['"]/g, "").trim(),
      private_key: privateKey,
    };
  }

  credentialDiag = `(hasJson=${Boolean(rawJson)}, jsonLen=${rawJson?.length || 0}, parseErr=${parseErr || "none"}, hasEmail=${Boolean(clientEmail)}, hasKey=${Boolean(privateKey)})`;
  return null;
}

function getGoogleClients() {
  const credentials = getGoogleCredentials();
  if (!credentials) {
    throw new Error(
      `No se encontraron credenciales válidas para Google Sheets API ${credentialDiag}. Configura GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON o GOOGLE_SHEETS_CLIENT_EMAIL / GOOGLE_SHEETS_PRIVATE_KEY.`
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const drive = google.drive({ version: "v3", auth });

  return { sheets, drive };
}

export interface MonthlySheetInfo {
  spreadsheetId: string;
  spreadsheetUrl: string;
  embedUrl: string;
  period: string; // YYYY-MM
  createdAt?: string;
  updatedAt?: string;
}

export const HEADERS = [
  "Fecha",
  "Hora",
  "ID Lead",
  "Contacto",
  "Teléfono",
  "Ubicación",
  "Cuenta / Zona",
  "Canal",
  "Tipo",
  "Mensaje / Requerimiento",
  "Servicio Calificado",
  "Rating (1-5)",
  "Estado Comercial",
  "Importe Venta (€)",
];

const COL_WIDTHS = [
  105, // Fecha
  70,  // Hora
  140, // ID Lead
  160, // Contacto
  125, // Teléfono
  150, // Ubicación
  150, // Cuenta / Zona
  100, // Canal
  85,  // Tipo
  300, // Mensaje
  160, // Servicio
  85,  // Rating
  140, // Estado
  130, // Importe Venta
];

export function getTabForLead(lead: Lead): string {
  const channel = lead.channel || "google_lsa";
  const adv = lead.advertising_source;
  const accId = lead.account_id || (adv?.channel === "google_lsa" ? adv.customer_id : adv?.campaign_id);

  if (channel === "google_lsa") {
    if (accId && accId in JG_LSA_ACCOUNTS) {
      return `LSA - ${(JG_LSA_ACCOUNTS as any)[accId].city}`;
    }
    const loc = (lead.location?.display_name || "").toLowerCase();
    if (loc.includes("barcelona") || loc.includes("bcn") || loc.includes("hospitalet") || loc.includes("badalona")) {
      return "LSA - Barcelona";
    }
    if (loc.includes("madrid") || loc.includes("alcorcón") || loc.includes("leganés") || loc.includes("getafe")) {
      return "LSA - Madrid";
    }
    if (lead.client_id === "jg") return "LSA - Zaragoza";
    return "Google LSA";
  } else {
    if (accId && accId in JG_META_CAMPAIGNS) {
      return `Meta - ${(JG_META_CAMPAIGNS as any)[accId].city || "Zaragoza"}`;
    }
    const loc = (lead.location?.display_name || "").toLowerCase();
    if (loc.includes("barcelona") || loc.includes("bcn")) return "Meta - Barcelona";
    if (loc.includes("madrid")) return "Meta - Madrid";
    if (lead.client_id === "jg") return "Meta - Zaragoza";
    return "Meta Ads";
  }
}

export function getAccountLabel(lead: Lead): string {
  const channel = lead.channel || "google_lsa";
  const adv = lead.advertising_source;
  const accId = lead.account_id || (adv?.channel === "google_lsa" ? adv.customer_id : adv?.campaign_id);

  if (channel === "google_lsa" && accId && accId in JG_LSA_ACCOUNTS) {
    return (JG_LSA_ACCOUNTS as any)[accId].name;
  }
  if (channel === "meta_ads" && accId && accId in JG_META_CAMPAIGNS) {
    return (JG_META_CAMPAIGNS as any)[accId].name;
  }
  return getTabForLead(lead).replace("LSA - ", "").replace("Meta - ", "");
}

export function formatLeadToRow(lead: Lead): (string | number)[] {
  const iso = lead.lead_created_at || lead.created_at || "";
  const datePart = iso.slice(0, 10);
  const timePart = iso.length >= 16 ? iso.slice(11, 16) : "";
  const phone = lead.phone || "";
  const contactName = lead.contact_name || lead.tracking?.customer_name || "";
  const location = lead.location?.display_name || "";
  const accountZone = getAccountLabel(lead);
  const channel = lead.channel === "meta_ads" ? "Meta Ads" : "Google LSA";
  const leadType =
    lead.lead_type === "phone_call"
      ? "Llamada"
      : lead.lead_type === "message"
      ? "Mensaje"
      : lead.lead_type || "";
  const message = lead.message || "";
  const service = lead.qualification?.service || lead.service_type || "";
  const rating =
    lead.computed_signals?.internal_rating != null
      ? lead.computed_signals.internal_rating
      : lead.score != null
      ? lead.score
      : "";
  const status =
    lead.qualification?.status === "venta" || lead.status === "cerrado"
      ? "Venta Cerrada"
      : lead.qualification?.status === "rechazado" || lead.status === "rechazado"
      ? "Rechazado"
      : "En Conversación";
  const saleAmount =
    lead.qualification?.sale_amount != null
      ? lead.qualification.sale_amount
      : lead.sale_amount != null
      ? lead.sale_amount
      : "";

  return [
    datePart,
    timePart,
    lead.id,
    contactName,
    phone,
    location,
    accountZone,
    channel,
    leadType,
    message,
    service,
    rating,
    status,
    saleAmount,
  ];
}

export async function applyAestheticFormatting(
  sheets: any,
  spreadsheetId: string,
  sheetId: number
) {
  const requests: any[] = [
    // 1. Congelar 1 fila (encabezado) y 2 columnas (Fecha y Hora)
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: {
            frozenRowCount: 1,
            frozenColumnCount: 2,
          },
        },
        fields: "gridProperties.frozenRowCount,gridProperties.frozenColumnCount",
      },
    },
    // 2. Altura de fila de encabezados (36px)
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: "ROWS", startIndex: 0, endIndex: 1 },
        properties: { pixelSize: 36 },
        fields: "pixelSize",
      },
    },
    // 3. Estilo del Encabezado (Navy Slate ejecutivo #0F172A, texto blanco bold)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: HEADERS.length },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 15 / 255, green: 23 / 255, blue: 42 / 255 },
            textFormat: {
              bold: true,
              foregroundColor: { red: 1, green: 1, blue: 1 },
              fontSize: 10,
              fontFamily: "Inter",
            },
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE",
            wrapStrategy: "WRAP",
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)",
      },
    },
    // 4. Formato base de datos (fuente Inter, 10pt, vertical MIDDLE)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: HEADERS.length },
        cell: {
          userEnteredFormat: {
            textFormat: { fontSize: 10, fontFamily: "Inter" },
            verticalAlignment: "MIDDLE",
          },
        },
        fields: "userEnteredFormat(textFormat,verticalAlignment)",
      },
    },
    // 5. Alineación centrada para Fecha (A) y Hora (B)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: 2 },
        cell: {
          userEnteredFormat: {
            horizontalAlignment: "CENTER",
          },
        },
        fields: "userEnteredFormat.horizontalAlignment",
      },
    },
    // 6. Alineación centrada para Rating (col 11) y Estado Comercial (col 12)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 1, startColumnIndex: 11, endColumnIndex: 13 },
        cell: {
          userEnteredFormat: {
            horizontalAlignment: "CENTER",
          },
        },
        fields: "userEnteredFormat.horizontalAlignment",
      },
    },
    // 7. Formato Moneda para Importe Venta (€) (col 13)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 1, startColumnIndex: 13, endColumnIndex: 14 },
        cell: {
          userEnteredFormat: {
            horizontalAlignment: "RIGHT",
            numberFormat: {
              type: "CURRENCY",
              pattern: "#,##0.00 €",
            },
          },
        },
        fields: "userEnteredFormat(horizontalAlignment,numberFormat)",
      },
    },
  ];

  // Anchos de columna proporcionales y amplios
  COL_WIDTHS.forEach((width, idx) => {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: idx, endIndex: idx + 1 },
        properties: { pixelSize: width },
        fields: "pixelSize",
      },
    });
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests },
  });
}

export async function getOrCreateClientFolderId(
  drive: any,
  rootFolderId: string,
  clientName: string
): Promise<string> {
  const safeName = clientName.replace(/'/g, "\\'");
  const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${safeName}' and '${rootFolderId}' in parents and trashed = false`;
  const res = await drive.files.list({ q, fields: "files(id, name)" });
  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id;
  }
  const createRes = await drive.files.create({
    requestBody: {
      name: clientName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [rootFolderId],
    },
    fields: "id",
  });
  return createRes.data.id;
}

/**
 * Obtiene o descubre el Google Sheet mensual de un cliente para un periodo (YYYY-MM).
 */
export async function getOrCreateMonthlySheet(
  clientId: string,
  clientName: string,
  period: string // ej: "2026-10"
): Promise<MonthlySheetInfo> {
  const db = getDb();
  const sheetDocRef = db
    .collection("clients")
    .doc(clientId)
    .collection("monthly_sheets")
    .doc(period);

  const existingSnap = await sheetDocRef.get();
  if (existingSnap.exists) {
    const data = existingSnap.data()!;
    if (data.spreadsheet_id) {
      return {
        spreadsheetId: data.spreadsheet_id,
        spreadsheetUrl:
          data.spreadsheet_url ||
          `https://docs.google.com/spreadsheets/d/${data.spreadsheet_id}/edit`,
        embedUrl:
          data.embed_url ||
          `https://docs.google.com/spreadsheets/d/${data.spreadsheet_id}/htmlembed?widget=true&chrome=false`,
        period,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }
  }

  const { sheets, drive } = getGoogleClients();
  const monthLabel = cap(fmt.month(`${period}-01`));
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();

  let spreadsheetId: string | undefined;

  if (rootFolderId) {
    const clientFolderId = await getOrCreateClientFolderId(
      drive,
      rootFolderId,
      clientName || clientId.toUpperCase()
    );

    const qSheet = `'${clientFolderId}' in parents and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`;
    const filesRes = await drive.files.list({
      q: qSheet,
      fields: "files(id, name)",
    });

    const files = filesRes.data.files || [];
    const matched =
      files.find((f) => f.name?.includes(period) || f.name?.toLowerCase().includes(monthLabel.toLowerCase())) ||
      files[0];

    if (matched && matched.id) {
      spreadsheetId = matched.id;
    } else {
      // 3. Crear automáticamente mediante el webhook de Google Apps Script
      const webhookUrl = process.env.GOOGLE_APPS_SCRIPT_URL?.trim();
      const sheetTitle = `${period} · ${monthLabel} ${period.slice(0, 4)}`;
      if (webhookUrl) {
        try {
          const resp = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              folderId: clientFolderId,
              title: sheetTitle,
            }),
          });
          const webhookData = await resp.json();
          if (webhookData.ok && webhookData.spreadsheetId) {
            spreadsheetId = webhookData.spreadsheetId;
          }
        } catch (webhookErr: any) {
          console.warn("[google-sheets] Webhook creation failed:", webhookErr.message);
        }
      }
    }
  }

  if (!spreadsheetId) {
    throw new Error(
      `No se encontró ni se pudo crear la hoja de cálculo para ${clientName} (${period}) en Google Drive.`
    );
  }

  // Comprobar pestañas según sea cliente multi-cuenta (ej. JG) o estándar
  const ssInfo = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheets = ssInfo.data.sheets || [];
  const existingTitles = existingSheets.map((s) => s.properties?.title);

  const isJg = clientId === "jg" || clientName.toLowerCase().includes("jg");
  const targetTabs = isJg
    ? [
        "LSA - Zaragoza",
        "LSA - Barcelona",
        "LSA - Madrid",
        "Meta - Zaragoza",
        "Meta - Barcelona",
        "Meta - Madrid",
      ]
    : ["Google LSA", "Meta Ads"];

  const requests: any[] = [];
  const defaultSheetId = existingSheets[0]?.properties?.sheetId || 0;

  if (!existingTitles.includes(targetTabs[0])) {
    requests.push({
      updateSheetProperties: {
        properties: {
          sheetId: defaultSheetId,
          title: targetTabs[0],
        },
        fields: "title",
      },
    });
  }

  for (let i = 1; i < targetTabs.length; i++) {
    const title = targetTabs[i];
    if (!existingTitles.includes(title)) {
      requests.push({
        addSheet: {
          properties: { title },
        },
      });
    }
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }

  // Re-leer para aplicar formato estético a cada pestaña
  const updatedSs = await sheets.spreadsheets.get({ spreadsheetId });
  for (const s of updatedSs.data.sheets || []) {
    if (targetTabs.includes(s.properties?.title || "")) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${s.properties?.title}!A1:N1`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [HEADERS] },
      });
      await applyAestheticFormatting(sheets, spreadsheetId, s.properties!.sheetId!);
    }
  }

  // Permisos editor para anyone
  try {
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: {
        role: "writer",
        type: "anyone",
      },
    });
  } catch (permErr: any) {
    console.warn("[google-sheets] Notice creating drive permission:", permErr.message);
  }

  const now = new Date().toISOString();
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  const embedUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/htmlembed?widget=true&chrome=false`;

  const info: MonthlySheetInfo = {
    spreadsheetId,
    spreadsheetUrl,
    embedUrl,
    period,
    createdAt: now,
    updatedAt: now,
  };

  await sheetDocRef.set({
    spreadsheet_id: spreadsheetId,
    spreadsheet_url: spreadsheetUrl,
    embed_url: embedUrl,
    period,
    created_at: now,
    updated_at: now,
  });

  return info;
}

export async function getMonthlySheetInfo(
  clientId: string,
  period: string
): Promise<MonthlySheetInfo | null> {
  const db = getDb();
  const sheetDocRef = db
    .collection("clients")
    .doc(clientId)
    .collection("monthly_sheets")
    .doc(period);

  const snap = await sheetDocRef.get();
  if (!snap.exists) return null;

  const data = snap.data()!;
  if (!data.spreadsheet_id) return null;

  return {
    spreadsheetId: data.spreadsheet_id,
    spreadsheetUrl:
      data.spreadsheet_url ||
      `https://docs.google.com/spreadsheets/d/${data.spreadsheet_id}/edit`,
    embedUrl:
      data.embed_url ||
      `https://docs.google.com/spreadsheets/d/${data.spreadsheet_id}/htmlembed?widget=true&chrome=false`,
    period,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Inserta o actualiza un lead en la pestaña correspondiente de su cuenta/zona.
 */
export async function syncLeadToMonthlySheet(
  clientId: string,
  clientName: string,
  lead: Lead
): Promise<{ ok: boolean; spreadsheetUrl?: string; error?: string }> {
  try {
    const rawDate = lead.lead_created_at || lead.created_at || new Date().toISOString();
    const period = rawDate.slice(0, 7); // "YYYY-MM"

    const sheetInfo = await getOrCreateMonthlySheet(clientId, clientName, period);
    const { sheets } = getGoogleClients();

    const tabName = getTabForLead(lead);
    const rowValues = formatLeadToRow(lead);

    // Buscar si el ID de lead ya existe en la columna C (ID Lead)
    const getRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetInfo.spreadsheetId,
      range: `${tabName}!C:C`,
    });

    const rows = getRes.data.values || [];
    let rowIndex = -1;

    for (let i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i][0] === lead.id) {
        rowIndex = i + 1; // 1-indexed
        break;
      }
    }

    if (rowIndex > 1) {
      // Actualizar fila existente
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetInfo.spreadsheetId,
        range: `${tabName}!A${rowIndex}:N${rowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [rowValues],
        },
      });
    } else {
      // Insertar nueva fila
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetInfo.spreadsheetId,
        range: `${tabName}!A:N`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [rowValues],
        },
      });
    }

    const db = getDb();
    await db
      .collection("clients")
      .doc(clientId)
      .collection("monthly_sheets")
      .doc(period)
      .update({ updated_at: new Date().toISOString() });

    return { ok: true, spreadsheetUrl: sheetInfo.spreadsheetUrl };
  } catch (err: any) {
    console.error(`[google-sheets] Error syncing lead ${lead.id} to sheet:`, err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Sincroniza en lote todos los leads de un mes separándolos en sus pestañas de cuenta/zona.
 */
export async function syncAllMonthLeadsToSheet(
  clientId: string,
  clientName: string,
  period: string, // YYYY-MM
  leads: Lead[]
): Promise<{ ok: boolean; count: number; spreadsheetUrl?: string; error?: string }> {
  try {
    const sheetInfo = await getOrCreateMonthlySheet(clientId, clientName, period);
    const { sheets } = getGoogleClients();

    // Agrupar leads por pestaña de destino
    const buckets: Record<string, any[]> = {};
    for (const lead of leads) {
      const tab = getTabForLead(lead);
      if (!buckets[tab]) buckets[tab] = [];
      buckets[tab].push(formatLeadToRow(lead));
    }

    const updateData: any[] = [];

    for (const [tab, rows] of Object.entries(buckets)) {
      // Limpiar datos previos manteniendo encabezado
      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetInfo.spreadsheetId,
        range: `${tab}!A2:N`,
      });

      if (rows.length > 0) {
        updateData.push({
          range: `${tab}!A2`,
          values: rows,
        });
      }
    }

    if (updateData.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: sheetInfo.spreadsheetId,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data: updateData,
        },
      });
    }

    const db = getDb();
    await db
      .collection("clients")
      .doc(clientId)
      .collection("monthly_sheets")
      .doc(period)
      .update({ updated_at: new Date().toISOString() });

    return { ok: true, count: leads.length, spreadsheetUrl: sheetInfo.spreadsheetUrl };
  } catch (err: any) {
    console.error(`[google-sheets] Error batch syncing leads for period ${period}:`, err.message);
    return { ok: false, count: 0, error: err.message };
  }
}
