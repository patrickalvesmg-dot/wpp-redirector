# WPP Redirector (Tintim-like)

Rotas:
- GET / => status do serviço
- GET /health => ok
- GET /wpp?to=5583... => redireciona pro WhatsApp e envia dados para o n8n

Env vars:
- N8N_WEBHOOK_URL: URL do webhook do n8n
- DEFAULT_TEXT_TEMPLATE: template da mensagem (use {{code}} para inserir o código)
