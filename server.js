import express from "express";
import crypto from "crypto";

const app = express();
app.set("trust proxy", 1);

// Webhook do n8n (produção ou teste)
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "";

// Mensagem padrão (se quiser alterar sem mexer no código)
const DEFAULT_TEXT_TEMPLATE =
  process.env.DEFAULT_TEXT_TEMPLATE ||
  "Olá! Vim pelo anúncio. Código: {{code}}";

// Habilita cookies (não é obrigatório, mas ajuda em visitas repetidas)
function setLeadCookie(res, lead_id) {
  try {
    res.cookie("lead_id", lead_id, {
      httpOnly: false,
      secure: true,
      sameSite: "Lax",
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 dias
    });
  } catch (_) {}
}

function buildWaLink(to, text) {
  const encoded = encodeURIComponent(text || "");
  return `https://wa.me/${to}${text ? `?text=${encoded}` : ""}`;
}

function safeStr(v, max = 500) {
  if (v === undefined || v === null) return null;
  const s = String(v);
  return s.length > max ? s.slice(0, max) : s;
}

function getIp(req) {
  const xf = req.headers["x-forwarded-for"]?.toString();
  return (xf ? xf.split(",")[0].trim() : req.socket.remoteAddress) || null;
}

/**
 * HOME - importante para não dar "Cannot GET /"
 * e evitar o serviço ser marcado como unhealthy.
 */
app.get("/", (req, res) => {
  res.status(200).send("Redirector online ✅ Use /wpp ou /health");
});

/**
 * HEALTHCHECK
 */
app.get("/health", (req, res) => {
  res.status(200).send("ok");
});

/**
 * REDIRECTOR PRINCIPAL
 * Ex:
 * /wpp?to=5583999999999&utm_source=meta&utm_campaign=test
 */
app.get("/wpp", async (req, res) => {
  const q = req.query;

  const toRaw = q.to;
  const to = safeStr(toRaw)?.replace(/\D/g, "") || "";
  if (!to) return res.status(400).send("Missing ?to= (WhatsApp number)");

  const lead_id = crypto.randomUUID();
  const short_code = lead_id.slice(0, 8);

  // Texto pré-preenchido (opcional)
  // Se vier ?text= usa o texto do link
  // Se não vier, usa o template do env com {{code}}
  const textFromQuery = q.text ? safeStr(q.text, 1000) : null;
