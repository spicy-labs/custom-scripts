import {
  DataSourceVariableSourceType,
  type EngineDataItem,
} from '@chili-publish/studio-sdk';

const PAGE_SIZE = 100;
const MAX_PAGES = 200; // safety cap against a connector that never ends

export async function getAllRows(variableId: string): Promise<EngineDataItem[]> {
  const sdk = window.SDK;
  if (!sdk) throw new Error('window.SDK is not initialised');

  const varRes = await sdk.variable.getById(variableId);
  if (!varRes.success) {
    throw new Error(`Could not load variable ${variableId}: ${varRes.error}`);
  }

  const variable = varRes.parsedData;
  const source =
    variable && 'value' in variable
      ? (variable.value as DataSourceVariableSource | undefined)
      : undefined;

  // 1. Injected data: one call returns everything
  if (source?.type === DataSourceVariableSourceType.injected) {
    const res = await sdk.variable.dataSource.getInjectedData(variableId);
    if (!res.success) throw new Error(`Injected data failed: ${res.error}`);
    return res.parsedData?.data ?? [];
  }

  // 2. Connector: page through using the continuation token
  if (source?.type === DataSourceVariableSourceType.connector) {
    const rows: EngineDataItem[] = [];
    const seenTokens = new Set<string>();
    let continuationToken: string | null = null;

    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await sdk.dataConnector.getPage(source.connectorId, {
        limit: PAGE_SIZE,
        continuationToken,
      });
      if (!res.success) {
        throw new Error(`Connector page ${page} failed: ${res.error}`);
      }

      rows.push(...(res.parsedData?.data ?? []));
      continuationToken = res.parsedData?.continuationToken ?? null;

      if (!continuationToken) return rows; // last page
      if (seenTokens.has(continuationToken)) {
        throw new Error(`Connector returned a repeated token: ${continuationToken}`);
      }
      seenTokens.add(continuationToken);
    }
    throw new Error(`Gave up after ${MAX_PAGES} pages`);
  }

  return [];
}
