const json_var_name = "json_data_sizing"; // name of the variable that holds the json
const frame_names = ["product1"]; // name of your image frames like "headline", "pattern1", "product"

const imageselectiondata = json.parse(gettextvariablevalue(json_var_name));

const layout = imageselectiondata[getselectedlayoutname()];

if (!layout) {
  throw error(`no data found for layout: ${getselectedlayoutname()}`);
}

const errors = [];

for (const framename of frame_names) {
  try {
    const imagevariabledependancies = layout[framename];

    console.log(framename + "---------------");

    if (!imagevariabledependancies) {
      throw error(`no data found for image variable: ${framename}`);
    }

    const dependancies = object.keys(imagevariabledependancies);

    if (dependancies.length == 0) {
      throw error(`something went wrong no dependancies for: ${framename}`);
    }

    let variablematch = null;

    for (const dependant of dependancies) {
      if (variablematch != null) continue;

      console.log(dependant);
      const compositekey = getcompositekeyfromvariables(dependant.split("|"));
      variablematch = imagevariabledependancies[dependant][compositekey];
      console.log(compositekey);
    }

    if (!variablematch) {
      throw error(`something went wrong no match found for: ${framename}`);
    }

    console.log(variablematch);

    const { x, y, w, h } = variablematch;

    setframex(framename, extractnumber(x));
    setframey(framename, extractnumber(y));
    setframewidth(framename, extractnumber(w));
    setframeheight(framename, extractnumber(h));
  } catch (e) {
    console.log(e.message);
    errors.push(e);
  }
}

if (errors.length > 0) {
  throw errors[0];
}

function extractnumber(measurement) {
  const match = measurement.match(/-?\d*\.?\d+/);
  return match ? parsefloat(match[0]) : null;
}

function getcompositekeyfromvariables(dependencies) {
  return dependencies
    .map((dep) => {
      const variablerawvalue = getvariablevalue(dep);
      const variablevalue =
        typeof variablerawvalue == "boolean"
          ? variablerawvalue
            ? "true"
            : "false"
          : variablerawvalue;
      return `${dep}:${variablevalue}`;
    })
    .join("|");
}
