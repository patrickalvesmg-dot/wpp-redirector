import express from "express";
import crypto from "crypto";

const app = express();
app.set("trust proxy", 1); // importante atrás do proxy do Easypanel (Traefik)

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

function buildWaLink(to, text) {
  const encoded = encodeURIComponent(text || "");
  return `https://wa.me/${to}${text ? `?text=${encoded}` : ""}`;
}

app.get("/wpp", async (req, res) => {
  const q = req.query;

  const to = String(q.to || "").replace(/\D/g, "");
  if (!to) return res.status(400).send("Missing ?to= (WhatsApp number)");

  const lead_id = crypto.randomUUID();

  const payload = {
    lead_id,
    ts: Date.now(),
    ip:
      req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
      req.socket.remoteAddress,
    ua: req.headers["user-agent"],
    referer: req.headers["referer"],

    to,
    campaign: q.campaign || null,

    utm_source: q.utm_source || null,
    utm_medium: q.utm_medium || null,
    utm_campaign: q.utm_campaign || null,
    utm_content: q.utm_content || null,
    utm_term: q.utm_term || null,

    fbclid: q.fbclid || null,
    gclid: q.gclid || null,
    ttclid: q.ttclid || null
  };

  // envia pro n8n (best-effort)
  if (N8N_WEBHOOK_URL) {
    try {
      await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (e) {}
  }

  const text = q.text
    ? String(q.text)
    : `Olá! Vim pelo anúncio. Código: ${lead_id.slice(0, 8)}`;

  return res.redirect(302, buildWaLink(to, text));
});

app.get("/health", (req, res) => res.status(200).send("ok"));

app.listen(process.env.PORT || 3000, () => {
  console.log("Redirector running");
});
