
async function setRow(variableId:string, rowId:string) {
  const res = await sdk.variable.dataSource.setValue(variableId, rowId);
  if (!res.success) throw new Error(`setValue failed: ${res.error}`);
}

async function setRowByLabel(variableId: string, label: string) {
  const rows = await getAllRows(variableId); // See https://github.com/spicy-labs/custom-scripts/blob/main/SDK/DataSourceVariable_getAllRows.ts
  const row = rows.find((r) => r.StoreDropdownLabel === label);
  if (!row) throw new Error(`No row with label "${label}"`);
  await setRow(variableId, row.__id__ as string);
}

// Example
// await setRowByLabel('68d3a61b-f472-5d6b-9b6f-5f18a7222cc8', 'First Store');
