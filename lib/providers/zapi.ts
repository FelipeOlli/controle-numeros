const ZAPI_BASE_URL = "https://api.z-api.io";
const PAGE_SIZE = 100;

export interface ZapiInstance {
  id: string;
  due: number | null;
  paymentStatus: string | null;
  phoneConnected: boolean;
  whatsappConnected: boolean;
}

interface ZapiInstancesPage {
  totalPage: number;
  page: number;
  content: {
    id: string;
    due: number | null;
    paymentStatus: string | null;
    phoneConnected: boolean;
    whatsappConnected: boolean;
  }[];
}

/**
 * Lista todas as instâncias da conta parceiro Z-API, paginando até o fim.
 * Único endpoint que devolve conexão + pagamento + vencimento numa chamada
 * (programa "Parceiro Integrador" — token de conta, não o Client-Token de
 * instância).
 */
export async function fetchZapiPartnerInstances(partnerToken: string): Promise<ZapiInstance[]> {
  const instances: ZapiInstance[] = [];
  let page = 1;
  let totalPage = 1;

  do {
    const res = await fetch(
      `${ZAPI_BASE_URL}/instances?page=${page}&pageSize=${PAGE_SIZE}`,
      {
        headers: {
          Authorization: `Bearer ${partnerToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!res.ok) {
      throw new Error(`Z-API respondeu ${res.status} ao listar instâncias (página ${page})`);
    }

    const data = (await res.json()) as ZapiInstancesPage;
    for (const item of data.content) {
      instances.push({
        id: item.id,
        due: item.due ?? null,
        paymentStatus: item.paymentStatus ?? null,
        phoneConnected: Boolean(item.phoneConnected),
        whatsappConnected: Boolean(item.whatsappConnected),
      });
    }

    totalPage = data.totalPage;
    page += 1;
  } while (page <= totalPage);

  return instances;
}
