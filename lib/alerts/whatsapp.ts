export interface WhatsappConfig {
  /** URL de envio da Evolution API (ou Meta Cloud), já com a instância no path. */
  sendUrl: string;
  apiKey: string;
  to: string;
}

export async function sendWhatsappAlert(config: WhatsappConfig, text: string) {
  const res = await fetch(config.sendUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: config.apiKey,
    },
    body: JSON.stringify({ number: config.to, text }),
  });

  if (!res.ok) {
    throw new Error(`Envio WhatsApp respondeu ${res.status}`);
  }
}
