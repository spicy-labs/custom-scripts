const JSON_VAR_NAME = "json_data"; // name of the variable that holds the json
const IMAGE_VAR_NAMES = []; // name of your image variables like "Headline", "Pattern1", "Product"
const IMAGE_VAR_SUFFIX = " Path"; // Name of the suffix for the image path

const imageSelectionData = JSON.parse(getTextVariableValue(JSON_VAR_NAME));

const layout = imageSelectionData[getSelectedLayoutName()];

if (!layout) {
  throw Error(`No data found for layout: ${getSelectedLayoutName()}`);
}

const errors = [];

for (const imageVarName of IMAGE_VAR_NAMES) {
  try {
    const imageVariableDependancies = layout[imageVarName];

    console.log(imageVarName + "---------------");

    if (!imageVariableDependancies) {
      throw Error(`No data found for image variable: ${imageVarName}`);
    }

    const dependancies = Object.keys(imageVariableDependancies);

    if (dependancies.length == 0) {
      throw Error(`Something went wrong no dependancies for: ${imageVarName}`);
    }

    let variableMatch = null;

    for (const dependant of dependancies) {
      if (variableMatch != null) continue;

      console.log(dependant);
      const compositeKey = getCompositeKeyFromVariables(dependant.split("|"));
      variableMatch = imageVariableDependancies[dependant][compositeKey];
      console.log(compositeKey);
    }

    if (!variableMatch) {
      throw Error(`Something went wrong no match found for: ${imageVarName}`);
    }

    console.log(variableMatch);

    const { path, imageName } = variableMatch;

    if (
      getVariableValue(imageVarName) != imageName ||
      getVariableValue(imageVarName + IMAGE_VAR_SUFFIX) != path
    ) {
      console.log(`Setting Variable ${imageVarName}`);
      setVariableValue(imageVarName + IMAGE_VAR_SUFFIX, path);
      setVariableValue(imageVarName, imageName);
    }
  } catch (e) {
    console.log(e.message);
    errors.push(e);
  }
}

if (errors.length > 0) {
  throw errors[0];
}

function getCompositeKeyFromVariables(dependencies) {
  return dependencies
    .map((dep) => {
      const variableRawValue = getVariableValue(dep);
      const variableValue =
        typeof variableRawValue == "boolean"
          ? variableRawValue
            ? "TRUE"
            : "FALSE"
          : variableRawValue;
      return `${dep}:${variableValue}`;
    })
    .join("|");
}
