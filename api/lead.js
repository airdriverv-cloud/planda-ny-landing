/**
 * PLANDA lead endpoint (Vercel / Node 18+).
 *
 * Env:
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 *   RESEND_API_KEY, LEAD_EMAIL_TO, LEAD_EMAIL_FROM
 *   CRM_WEBHOOK_URL, CRM_AUTH_HEADER
 *   ALLOWED_ORIGINS (comma-separated)
 */
const DEFAULT_ORIGINS = [
  "https://airdriverv-cloud.github.io",
  "https://event.plan-da.ru",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
];

function allowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS;
  if (!raw) return DEFAULT_ORIGINS;
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}

function setCors(req, res) {
  const origin = req.headers.origin || "";
  const allowed = allowedOrigins();
  if (allowed.includes("*") || allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || allowed[0]);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
}

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function clean(value, max = 800) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate() {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Moscow",
  }).format(new Date());
}

function buildText(p) {
  return [
    "🎄 Новая заявка с лендинга PLANDA",
    "",
    `Имя: ${p.name}`,
    `Телефон: ${p.phone}`,
    p.company ? `Компания: ${p.company}` : "",
    `Гостей: ${p.guests}`,
    `Дата: ${p.date || "не выбрана"}`,
    `Формат: ${p.format || "не выбран"}`,
    `Бюджет: ${p.budget || "не указан"}`,
    p.needs?.length ? `Задачи: ${p.needs.join(", ")}` : "",
    "",
    `Страница: ${p.page || "-"}`,
    p.utm && Object.keys(p.utm).length ? `UTM: ${JSON.stringify(p.utm)}` : "",
    `Время: ${fmtDate()} МСК`,
  ].filter(Boolean).join("\n").slice(0, 3900);
}

async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return null;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) throw new Error(`telegram_${res.status}`);
  return "telegram";
}

async function sendEmail(p) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_EMAIL_TO;
  const from = process.env.LEAD_EMAIL_FROM;
  if (!apiKey || !to || !from) return null;

  const rows = [
    ["Имя", p.name],
    ["Телефон", p.phone],
    ["Компания", p.company || "—"],
    ["Гостей", p.guests],
    ["Дата", p.date || "—"],
    ["Формат", p.format || "—"],
    ["Бюджет", p.budget || "—"],
    ["Задачи", p.needs?.length ? p.needs.join(", ") : "—"],
    ["Страница", p.page || "—"],
    ["UTM", p.utm && Object.keys(p.utm).length ? JSON.stringify(p.utm) : "—"],
  ];

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:620px">
      <h2 style="margin:0 0 16px">Новая заявка с лендинга</h2>
      <table style="border-collapse:collapse;width:100%">
        ${rows.map(([k, v]) => `
          <tr>
            <td style="border-bottom:1px solid #eee;padding:8px 12px 8px 0;color:#777;white-space:nowrap">${escapeHtml(k)}</td>
            <td style="border-bottom:1px solid #eee;padding:8px 0">${escapeHtml(v)}</td>
          </tr>`).join("")}
      </table>
      <p style="color:#999;font-size:12px;margin-top:18px">${fmtDate()} МСК</p>
    </div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: to.split(",").map(s => s.trim()).filter(Boolean),
      subject: `Новая заявка: ${p.name}, ${p.guests} гостей`,
      html,
    }),
  });
  if (!res.ok) throw new Error(`email_${res.status}`);
  return "email";
}

async function sendCrm(p) {
  const url = process.env.CRM_WEBHOOK_URL;
  if (!url) return null;
  const headers = { "Content-Type": "application/json" };
  if (process.env.CRM_AUTH_HEADER) headers.Authorization = process.env.CRM_AUTH_HEADER;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      source: "planda-ny-landing",
      name: p.name,
      phone: p.phone,
      company: p.company,
      guests: p.guests,
      date: p.date,
      format: p.format,
      budget: p.budget,
      needs: p.needs,
      page: p.page,
      utm: p.utm,
      consent: true,
      createdAt: new Date().toISOString(),
    }),
  });
  if (!res.ok) throw new Error(`crm_${res.status}`);
  return "crm";
}

async function sendBitrix(p) {
  const url = process.env.BITRIX24_WEBHOOK_URL;
  if (!url) return null;

  const fields = {
    TITLE: `Заявка с лендинга: ${p.name}, ${p.guests} гостей`,
    NAME: p.name,
    PHONE: [{ VALUE: p.phone, VALUE_TYPE: "WORK" }],
    COMPANY_TITLE: p.company || "",
    COMMENTS: buildText(p),
    SOURCE_ID: "WEB",
    SOURCE_DESCRIPTION: p.page || "planda-ny-landing",
    UTM_SOURCE: p.utm?.utm_source || "",
    UTM_MEDIUM: p.utm?.utm_medium || "",
    UTM_CAMPAIGN: p.utm?.utm_campaign || "",
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`bitrix_${res.status}`);
  const data = await res.json().catch(() => ({}));
  if (data.error) throw new Error(`bitrix_${data.error}`);
  return "bitrix24";
}

module.exports = async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "method_not_allowed" });
  }

  const origin = req.headers.origin || "";
  if (origin && !allowedOrigins().includes("*") && !allowedOrigins().includes(origin)) {
    return json(res, 403, { ok: false, error: "origin_not_allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return json(res, 400, { ok: false, error: "bad_json" }); }
  }
  if (!body || typeof body !== "object") {
    return json(res, 400, { ok: false, error: "bad_body" });
  }

  // Honeypot: silently accept bots, never deliver.
  if (clean(body.website)) return json(res, 200, { ok: true });

  const name = clean(body.name, 80);
  const phone = clean(body.phone, 30);
  const digits = phone.replace(/\D/g, "");
  if (name.length < 2) return json(res, 400, { ok: false, error: "name_required" });
  if (digits.length < 10 || digits.length > 15) {
    return json(res, 400, { ok: false, error: "phone_invalid" });
  }
  if (body.consent !== true) return json(res, 400, { ok: false, error: "consent_required" });

  const guests = Number(body.guests);
  if (!Number.isFinite(guests) || guests < 5 || guests > 5000) {
    return json(res, 400, { ok: false, error: "guests_invalid" });
  }

  const payload = {
    name,
    phone,
    company: clean(body.company, 160),
    guests: Math.round(guests),
    date: clean(body.date, 80),
    format: clean(body.format, 80),
    budget: clean(body.budget, 80),
    needs: Array.isArray(body.needs) ? body.needs.slice(0, 10).map(v => clean(v, 80)) : [],
    page: clean(body.page, 500),
    utm: body.utm && typeof body.utm === "object" ? body.utm : {},
  };

  const text = buildText(payload);
  const tasks = [];
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    tasks.push(["telegram", sendTelegram(text)]);
  }
  if (process.env.RESEND_API_KEY && process.env.LEAD_EMAIL_TO && process.env.LEAD_EMAIL_FROM) {
    tasks.push(["email", sendEmail(payload)]);
  }
  if (process.env.CRM_WEBHOOK_URL) {
    tasks.push(["crm", sendCrm(payload)]);
  }
  if (process.env.BITRIX24_WEBHOOK_URL) {
    tasks.push(["bitrix24", sendBitrix(payload)]);
  }

  if (!tasks.length) {
    console.error("lead: no delivery channels configured");
    return json(res, 503, { ok: false, error: "no_delivery_channels" });
  }

  const results = await Promise.allSettled(tasks.map(([, promise]) => promise));
  const delivered = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value) delivered.push(tasks[index][0]);
    else if (result.status === "rejected") console.error("lead delivery failed:", tasks[index][0], result.reason?.message || "unknown");
  });

  if (!delivered.length) {
    return json(res, 502, { ok: false, error: "delivery_failed" });
  }
  return json(res, 200, { ok: true, delivered });
};
