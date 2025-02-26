const JSON_VAR_NAME = "json_data_sizing"; // name of the variable that holds the json
const FRAME_NAMES = ["Product1"]; // name of your image frames like "Headline", "Pattern1", "Product"

const imageSelectionData = JSON.parse(getTextVariableValue(JSON_VAR_NAME));

const layout = imageSelectionData[getSelectedLayoutName()];

if (!layout) {
  throw Error(`No data found for layout: ${getSelectedLayoutName()}`);
}

const errors = [];

for (const frameName of FRAME_NAMES) {
  try {
    const imageVariableDependancies = layout[frameName];

    console.log(frameName + "---------------");

    if (!imageVariableDependancies) {
      throw Error(`No data found for image variable: ${frameName}`);
    }

    const dependancies = Object.keys(imageVariableDependancies);

    if (dependancies.length == 0) {
      throw Error(`Something went wrong no dependancies for: ${frameName}`);
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
      throw Error(`Something went wrong no match found for: ${frameName}`);
    }

    console.log(variableMatch);

    const { x, y, w, h } = variableMatch;

    setFrameX(frameName, extractNumber(x));
    setFrameY(frameName, extractNumber(y));
    setFrameWidth(frameName, extractNumber(w));
    setFrameHeight(frameName, extractNumber(h));
  } catch (e) {
    console.log(e.message);
    errors.push(e);
  }
}

if (errors.length > 0) {
  throw errors[0];
}

function extractNumber(measurement) {
  const match = measurement.match(/-?\d*\.?\d+/);
  return match ? parseFloat(match[0]) : null;
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
