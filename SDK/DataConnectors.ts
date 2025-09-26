// Get current selected DataConnector
const selectedDataConnectorId = (await SDK.dataSource.getDataSource()).parsedData.id;

// Mappings
interface ContextDictionary {
    [Key: string]: string | boolean;
}

interface EngineToConnectorMapping {
    name: string;
    value: ContextDictionary[keyof ContextDictionary];
    direction: "engineToConnector";
}

// Get the mappings - configuration options
const connectorMappings:EngineToConnectorMapping[] = (await SDK.connector.getMappings(selectedDataConnectorId, "engineToConnector")).parsedData;

const updatedMappings = connectorMappings.map(m => ({...m, value: m.value += "hi"}));

// Update mappings - configuration option
SDK.connector.updateMappings(selectedDataConnectorId, updatedMappings);


// Getting data from the connector is a bit complicated, because it uses this thing called PageConfig, below I have the simplest use-case.
interface PageConfig {
    filters?: DataFilter[] | null;
    sorting?: DataSorting[] | null;
    continuationToken?: string | null;
    limit: number;
}

const pageConfig = {limit: 999}

const data = (await SDK.dataConnector.getPage(
  selectedDataConnectorId, 
  pageConfig, 
  mappingsToContext(updatedMappings))).parsedData

// Helper function to turn mapping into context
function mappingsToContext(mappings:EngineToConnectorMapping[]) {
  return mappings.reduce((cx, m) => {cx[m.name] = m.value; return cx}, {})
}


// There is no way to select row, the datasource is not stored in the document.
// This function is misleading it should be called updateVariables as it just takes in an object where the keys are the variable names and values are used to update the variables found.
await SDK.dataSource.setDataRow(data[5]))

