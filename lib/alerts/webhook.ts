import crypto from "node:crypto";

export interface WebhookConfig {
  url: string;
}

export async function sendWebhook(config: WebhookConfig, payload: unknown) {
  const body = JSON.stringify(payload);
  const secret = process.env.WEBHOOK_SIGNING_SECRET ?? "";
  const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");

  const res = await fetch(config.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Signature": signature,
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`Webhook respondeu ${res.status}`);
  }
}
