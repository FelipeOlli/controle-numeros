const GRAPH_API_BASE_URL = "https://graph.facebook.com/v21.0";

export interface MetaHealthIssue {
  /** PHONE_NUMBER | WABA | BUSINESS | APP — onde está o problema. */
  entityType: string;
  canSendMessage: string | undefined;
  errorCode: number | undefined;
  description: string | undefined;
  /** Sugestão de correção que a própria Meta devolve. */
  possibleSolution: string | undefined;
}

export interface MetaPhoneNumberStatus {
  phoneNumberId: string;
  /** Pode vir ausente — nem toda WABA/número devolve "status" no edge. */
  status: string | undefined;
  /** health_status.can_send_message: AVAILABLE | LIMITED | BLOCKED. */
  canSendMessage: string | undefined;
  /** Erros/restrições de cada camada (número, WABA, empresa, app). */
  issues: MetaHealthIssue[];
  qualityRating: string | undefined;
  messagingTier: string | null;
}

/**
 * Status + qualidade + tier de todos os números de uma WABA, numa chamada só
 * — GET /{wabaId}/phone_numbers. Autenticado por system user access token
 * (Business Settings → Usuários do sistema → whatsapp_business_management),
 * gerado por empresa e guardado em ProviderCredential (platform META_CLOUD).
 */
export async function fetchMetaPhoneNumbers(
  wabaId: string,
  accessToken: string,
): Promise<MetaPhoneNumberStatus[]> {
  // Sem "fields" explícito, o edge /phone_numbers só devolve o conjunto
  // padrão da Graph API (id, nome, telefone) — status e messaging_limit_tier
  // ficam de fora e chegam undefined.
  const fields =
    "id,display_phone_number,status,health_status,quality_rating,messaging_limit_tier";
  const res = await fetch(`${GRAPH_API_BASE_URL}/${wabaId}/phone_numbers?fields=${fields}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Graph API respondeu ${res.status} ao consultar números da WABA`);
  }

  const data = (await res.json()) as {
    data: {
      id: string;
      status?: string;
      health_status?: {
        can_send_message?: string;
        entities?: {
          entity_type?: string;
          can_send_message?: string;
          errors?: { error_code?: number; error_description?: string; possible_solution?: string }[];
        }[];
      };
      quality_rating?: string;
      messaging_limit_tier?: string;
    }[];
  };

  return data.data.map((n) => ({
    phoneNumberId: n.id,
    status: n.status,
    canSendMessage: n.health_status?.can_send_message,
    issues: (n.health_status?.entities ?? []).flatMap((entity) => {
      const errors = entity.errors ?? [];
      if (errors.length === 0) {
        // Camada limitada/bloqueada sem erro detalhado ainda é um problema.
        return entity.can_send_message && entity.can_send_message !== "AVAILABLE"
          ? [
              {
                entityType: entity.entity_type ?? "UNKNOWN",
                canSendMessage: entity.can_send_message,
                errorCode: undefined,
                description: undefined,
                possibleSolution: undefined,
              },
            ]
          : [];
      }
      return errors.map((error) => ({
        entityType: entity.entity_type ?? "UNKNOWN",
        canSendMessage: entity.can_send_message,
        errorCode: error.error_code,
        description: error.error_description,
        possibleSolution: error.possible_solution,
      }));
    }),
    qualityRating: n.quality_rating,
    messagingTier: n.messaging_limit_tier ?? null,
  }));
}

/**
 * Quantos apps estão inscritos nos webhooks da WABA — GET
 * /{wabaId}/subscribed_apps. Sem nenhum, a Meta não entrega as mensagens
 * recebidas a ninguém: o número "funciona" pra enviar, mas não recebe.
 */
export async function fetchMetaSubscribedAppsCount(
  wabaId: string,
  accessToken: string,
): Promise<number> {
  const res = await fetch(`${GRAPH_API_BASE_URL}/${wabaId}/subscribed_apps`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Graph API respondeu ${res.status} ao consultar webhooks da WABA`);
  }

  const data = (await res.json()) as { data?: unknown[] };
  return data.data?.length ?? 0;
}

export interface MetaPhoneSpend {
  phoneNumberId: string;
  cost: number | null;
  currency: string | null;
}

/**
 * Gasto por número no intervalo pedido — GET /{wabaId} com pricing_analytics,
 * dimension PHONE (sem ela a resposta não separa por número). Cost vem null
 * quando a conta compartilha linha de crédito de um Solution Partner/BSP —
 * nesse caso a Graph API só devolve volume, não custo.
 */
export async function fetchMetaSpend(
  wabaId: string,
  accessToken: string,
  start: Date,
  end: Date,
): Promise<MetaPhoneSpend[]> {
  const startSec = Math.floor(start.getTime() / 1000);
  const endSec = Math.floor(end.getTime() / 1000);
  const fields = `pricing_analytics.start(${startSec}).end(${endSec}).granularity(MONTHLY).dimensions(["PHONE"])`;

  const res = await fetch(
    `${GRAPH_API_BASE_URL}/${wabaId}?fields=${encodeURIComponent(fields)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    throw new Error(`Graph API respondeu ${res.status} ao consultar gasto da WABA`);
  }

  const data = (await res.json()) as {
    pricing_analytics?: {
      data?: {
        data_points?: { phone_number?: string; cost?: number }[];
      }[];
    };
  };

  const points = data.pricing_analytics?.data?.[0]?.data_points ?? [];

  // Soma por número — o período pode vir fatiado em mais de um data_point
  // mesmo pedindo granularidade MONTHLY (ex: mês em andamento).
  const totals = new Map<string, number>();
  for (const point of points) {
    if (!point.phone_number) continue;
    const current = totals.get(point.phone_number) ?? 0;
    totals.set(point.phone_number, current + (point.cost ?? 0));
  }

  return Array.from(totals.entries()).map(([phoneNumberId, cost]) => ({
    phoneNumberId,
    cost,
    currency: null,
  }));
}
