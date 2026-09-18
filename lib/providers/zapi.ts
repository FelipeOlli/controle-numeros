const ZAPI_BASE_URL = "https://api.z-api.io";

export interface ZapiInstanceStatus {
  connected: boolean;
  smartphoneConnected: boolean;
  error?: string;
}

/**
 * Status de conexão de uma instância — conta "Cliente" padrão do Z-API,
 * autenticada pelo Client-Token da conta (não pelo Partner-Token, que exige
 * o programa "Parceiro Integrador" e essa conta não tem acesso a ele).
 * Não devolve pagamento nem vencimento — isso só existe no painel web do
 * Z-API pra contas Cliente, sem endpoint correspondente.
 */
export async function fetchZapiInstanceStatus(
  instanceId: string,
  instanceToken: string,
  clientToken: string,
): Promise<ZapiInstanceStatus> {
  const res = await fetch(
    `${ZAPI_BASE_URL}/instances/${instanceId}/token/${instanceToken}/status`,
    {
      headers: {
        "Client-Token": clientToken,
        "Content-Type": "application/json",
      },
    },
  );

  if (!res.ok) {
    throw new Error(`Z-API respondeu ${res.status} ao consultar status da instância`);
  }

  const data = (await res.json()) as ZapiInstanceStatus;
  return {
    connected: Boolean(data.connected),
    smartphoneConnected: Boolean(data.smartphoneConnected),
    error: data.error,
  };
}
