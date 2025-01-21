const JSON_VAR_NAME = "json_data";
const IMAGE_VAR_NAMES = ["Headline", "Product"];

const imageSelectionData = JSON.parse(getTextVariableValue(JSON_VAR_NAME));

const isdLayout = imageSelectionData[getSelectedLayoutName()];

if (!isdLayout) {
  throw Error(`No data found for layout: ${getSelectedLayoutName()}`);
}

for (const imageVarName of IMAGE_VAR_NAMES) {
  const isdImageVariable = isdLayout[imageVarName];

  if (!isdImageVariable) {
    throw Error(`No data found for image variable: ${imageVarName}`);
  }

  const { dependencies, data } = isdImageVariable;

  if (!dependencies || !data) {
    throw Error(
      `Something went wrong no dependancies or data for: ${imageVarName}`,
    );
  }

  console.log(dependencies);

  const compositeKey = getCompositeKeyFromVariables(dependencies);

  const result = data[compositeKey];

  if (!result) {
    throw Error(
      `No result for the following order of variables with values:${compositeKey}`,
    );
  }

  console.log(result);

  const { path, imageName } = result;

  setVariableValue(imageVarName + "_Path", path);
  setVariableValue(imageVarName, imageName);
}

function getCompositeKeyFromVariables(dependencies) {
  return dependencies.map((dep) => `${dep}:${getVariableValue(dep)}`).join("|");
}
