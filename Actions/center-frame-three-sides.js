const FRAME_NAME_TO_MEASURE = "mealtype_image";
const frameDistances = getFrameDistancesToPageEdge(FRAME_NAME_TO_MEASURE, true);
const frameMargin = getFrameMargin(frameDistances, true);
functionMoveFrameToCenter(FRAME_NAME_TO_MEASURE, frameMargin, frameDistances, true);
function functionMoveFrameToCenter(frameName, margin, frameDistances, log = false) {
  if (log) {
    console.log(`functionMoveFrameToCenter called with frameName: ${frameName}, margin: ${margin}`);
  }
  const [top, left, bottom, right] = frameDistances;
  const maxDistance = Math.max(top, left, bottom, right);
  const page = studio.pages.getSize();
  const pageWidth = page.width;
  const pageHeight = page.height;
  const frame = studio.frames.byName(frameName);
  let newX = frame.x;
  let newY = frame.y;
  let newWidth = frame.width;
  let newHeight = frame.height;
  if (maxDistance === top) {
    newX = margin;
    newWidth = Math.max(0, pageWidth - 2 * margin);
    newY = pageHeight - margin - frame.height;
    if (log) {
      console.log("Top is largest -> set left/right/bottom to margin");
    }
  } else if (maxDistance === bottom) {
    newX = margin;
    newWidth = Math.max(0, pageWidth - 2 * margin);
    newY = margin;
    if (log) {
      console.log("Bottom is largest -> set left/right/top to margin");
    }
  } else if (maxDistance === left) {
    newY = margin;
    newHeight = Math.max(0, pageHeight - 2 * margin);
    newX = pageWidth - margin - frame.width;
    if (log) {
      console.log("Left is largest -> set top/bottom/right to margin");
    }
  } else {
    newY = margin;
    newHeight = Math.max(0, pageHeight - 2 * margin);
    newX = margin;
    if (log) {
      console.log("Right is largest -> set top/bottom/left to margin");
    }
  }
  if (log) {
    console.log(`Applying new geometry -> x:${newX}, y:${newY}, width:${newWidth}, height:${newHeight}`);
  }
  if (maxDistance === top || maxDistance === bottom) {
    frame.setX(newX);
    frame.setWidth(newWidth);
    frame.setY(newY);
  } else {
    frame.setY(newY);
    frame.setHeight(newHeight);
    frame.setX(newX);
  }
}
function getFrameMargin(frameDistances, log = false) {
  if (log) {
    console.log(`getFrameMargin called with distances:`, frameDistances);
  }
  const [top, left, bottom, right] = frameDistances;
  if (log) {
    console.log(`Distances - top: ${top}, left: ${left}, bottom: ${bottom}, right: ${right}`);
  }
  const maxDistance = Math.max(top, left, bottom, right);
  if (log) {
    console.log(`Maximum distance: ${maxDistance}`);
  }
  if (maxDistance === top) {
    const margin = Math.min(left, right);
    if (log) {
      console.log(`Top is max, margin (min of left/right): ${margin}`);
    }
    return margin;
  } else if (maxDistance === bottom) {
    const margin = Math.min(left, right);
    if (log) {
      console.log(`Bottom is max, margin (min of left/right): ${margin}`);
    }
    return margin;
  } else if (maxDistance === left) {
    const margin = Math.min(top, bottom);
    if (log) {
      console.log(`Left is max, margin (min of top/bottom): ${margin}`);
    }
    return margin;
  } else {
    const margin = Math.min(top, bottom);
    if (log) {
      console.log(`Right is max, margin (min of top/bottom): ${margin}`);
    }
    return margin;
  }
}
function getFrameDistancesToPageEdge(frameName, log = true) {
  try {
    const page = studio.pages.getSize();
    const pageWidth = page.width;
    const pageHeight = page.height;
    if (log) {
      console.log(`Page dimensions: ${pageWidth}w x ${pageHeight}h`);
    }
    const frame = studio.frames.byName(FRAME_NAME_TO_MEASURE);
    if (log) {
      console.log(`Found frame "${FRAME_NAME_TO_MEASURE}": x:${frame.x}, y:${frame.y}, w:${frame.width}, h:${frame.height}`);
    }
    const topDistance = frame.y;
    const leftDistance = frame.x;
    const bottomDistance = page.height - (frame.y + frame.height);
    const rightDistance = page.width - (frame.x + frame.width);
    const distances = [
      topDistance,
      leftDistance,
      bottomDistance,
      rightDistance
    ];
    if (log) {
      console.log(`Distances for frame "${FRAME_NAME_TO_MEASURE}":`);
      console.log(`- Top: ${topDistance}`);
      console.log(`- Left: ${leftDistance}`);
      console.log(`- Bottom: ${bottomDistance}`);
      console.log(`- Right: ${rightDistance}`);
      console.log("In array format [top, left, bottom, right]:", distances);
      console.log(distances);
    }
    return distances;
  } catch (error) {
    if (log) {
      console.log(`Error: Could not find frame named "${FRAME_NAME_TO_MEASURE}".`);
      console.log(error);
    }
    throw error;
  }
}
