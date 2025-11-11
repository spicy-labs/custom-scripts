// --- Get Frame Distances to Page Edge ---
//
// This script calculates the distance between a frame's edges and the page edges,
// determines the appropriate margin, and centers the frame within the available space.

//
//  ┌─────────────────────────────────────────────────────────┐
//  │                         PAGE                            │
//  │                                                         │
//  │         top distance                                    │
//  │              ↓                                          │
//  │    ┌─────────────────────┐                             │
//  │    │                     │                             │
//  │ ←  │      FRAME          │  →                          │
//  │left│                     │right                        │
//  │    │                     │distance                     │
//  │    └─────────────────────┘                             │
//  │              ↑                                          │
//  │         bottom distance                                │
//  │                                                         │
//  └─────────────────────────────────────────────────────────┘
//
// This script:
// 1. Measures distances from frame edges to page edges
// 2. Finds which distance is largest
// 3. Centers the frame by equalizing the other distances to match the margin
//

// -----------------------------------------------------------------
// CONFIGURATION: Set the name of your frame here
// -----------------------------------------------------------------
const FRAME_NAME_TO_MEASURE = "mealtype_image";
// -----------------------------------------------------------------

const frameDistances = getFrameDistancesToPageEdge(FRAME_NAME_TO_MEASURE, true);
const frameMargin = getFrameMargin(frameDistances, true);
functionMoveFrameToCenter(
  FRAME_NAME_TO_MEASURE,
  frameMargin,
  frameDistances,
  true,
);

type FrameDistances = [
  top: number,
  left: number,
  bottom: number,
  right: number,
];

function functionMoveFrameToCenter(
  frameName: string,
  margin: number,
  frameDistances: FrameDistances,
  log = false,
) {
  if (log) {
    console.log(
      `functionMoveFrameToCenter called with frameName: ${frameName}, margin: ${margin}`,
    );
  }

  const [top, left, bottom, right] = frameDistances;
  const maxDistance = Math.max(top, left, bottom, right);

  // Read current page and frame data
  const page = studio.pages.getSize();
  const pageWidth = page.width;
  const pageHeight = page.height;
  const frame = studio.frames.byName(frameName);

  // Targets: set the page distance on all three sides that are not the largest to `margin`.
  // Achieve this by translating the frame and, when necessary, resizing along the
  // perpendicular axis to set both opposite sides to `margin`.
  let newX = frame.x;
  let newY = frame.y;
  let newWidth = frame.width;
  let newHeight = frame.height;

  if (maxDistance === top) {
    // Largest is TOP -> set LEFT, RIGHT and BOTTOM to margin
    newX = margin; // left = margin
    newWidth = Math.max(0, pageWidth - 2 * margin); // right = margin
    newY = pageHeight - margin - frame.height; // bottom = margin (keep height)
    if (log) {
      console.log("Top is largest -> set left/right/bottom to margin");
    }
  } else if (maxDistance === bottom) {
    // Largest is BOTTOM -> set LEFT, RIGHT and TOP to margin
    newX = margin; // left = margin
    newWidth = Math.max(0, pageWidth - 2 * margin); // right = margin
    newY = margin; // top = margin (keep height)
    if (log) {
      console.log("Bottom is largest -> set left/right/top to margin");
    }
  } else if (maxDistance === left) {
    // Largest is LEFT -> set TOP, BOTTOM and RIGHT to margin
    newY = margin; // top = margin
    newHeight = Math.max(0, pageHeight - 2 * margin); // bottom = margin
    newX = pageWidth - margin - frame.width; // right = margin (keep width)
    if (log) {
      console.log("Left is largest -> set top/bottom/right to margin");
    }
  } else {
    // Largest is RIGHT -> set TOP, BOTTOM and LEFT to margin
    newY = margin; // top = margin
    newHeight = Math.max(0, pageHeight - 2 * margin); // bottom = margin
    newX = margin; // left = margin (keep width)
    if (log) {
      console.log("Right is largest -> set top/bottom/left to margin");
    }
  }

  if (log) {
    console.log(
      `Applying new geometry -> x:${newX}, y:${newY}, width:${newWidth}, height:${newHeight}`,
    );
  }

  // Apply updates. Order matters to hit exact margins on both sides of the resized axis.
  if (maxDistance === top || maxDistance === bottom) {
    // Horizontal axis must have both sides at `margin` -> set X and WIDTH
    frame.setX(newX);
    frame.setWidth(newWidth);
    frame.setY(newY);
  } else {
    // Vertical axis must have both sides at `margin` -> set Y and HEIGHT
    frame.setY(newY);
    frame.setHeight(newHeight);
    frame.setX(newX);
  }
}

function getFrameMargin(frameDistances: FrameDistances, log = false) {
  if (log) {
    console.log(`getFrameMargin called with distances:`, frameDistances);
  }
  const [top, left, bottom, right] = frameDistances;
  if (log) {
    console.log(
      `Distances - top: ${top}, left: ${left}, bottom: ${bottom}, right: ${right}`,
    );
  }

  const maxDistance = Math.max(top, left, bottom, right);
  if (log) {
    console.log(`Maximum distance: ${maxDistance}`);
  }

  if (maxDistance === top) {
    // find the smalles between left and right and return
    const margin = Math.min(left, right);
    if (log) {
      console.log(`Top is max, margin (min of left/right): ${margin}`);
    }
    return margin;
  } else if (maxDistance === bottom) {
    // find the smalles between left and right and return
    const margin = Math.min(left, right);
    if (log) {
      console.log(`Bottom is max, margin (min of left/right): ${margin}`);
    }
    return margin;
  } else if (maxDistance === left) {
    // find the smalles between top and bottom and return
    const margin = Math.min(top, bottom);
    if (log) {
      console.log(`Left is max, margin (min of top/bottom): ${margin}`);
    }
    return margin;
  } else {
    // find the smalles between top and bottom and return
    const margin = Math.min(top, bottom);
    if (log) {
      console.log(`Right is max, margin (min of top/bottom): ${margin}`);
    }
    return margin;
  }
}

/** 
function findFrameMargin(frameDistances: FrameDistances) {
  // Type safety ensures frameDistances always has exactly 4 defined values

  // frameDistances format: [top, left, bottom, right]
  const [top, left, bottom, right] = frameDistances;

  // Find the maximum distance
  const maxDistance = Math.max(top, left, bottom, right);

  // Determine which side has the max distance and get the opposite side + other two sides
  let oppositeSide: number;
  let otherTwo: number[];

  if (maxDistance === top) {
    oppositeSide = bottom;
    otherTwo = [left, right];
  } else if (maxDistance === bottom) {
    oppositeSide = top;
    otherTwo = [left, right];
  } else if (maxDistance === left) {
    oppositeSide = right;
    otherTwo = [top, bottom];
  } else {
    // maxDistance === right
    oppositeSide = left;
    otherTwo = [top, bottom];
  }

  // Check if the other two sides are the same value (within 2 decimal places)
  // @ts-ignore
  const areSame = Math.abs(otherTwo[0] - otherTwo[1]) < 0.01;

  if (areSame) {
    // If they are the same, return that value as the margin
    return otherTwo[0] as number;
  } else {
    // Otherwise, take the average of all three sides (opposite + other two)
    // @ts-ignore
    return (oppositeSide + otherTwo[0] + otherTwo[1]) / 3;
  }
}
  */

function getFrameDistancesToPageEdge(
  frameName: string,
  log = true,
): FrameDistances {
  try {
    // 1. Get the current page's dimensions
    // We use studio.pages.getSize() which returns a PageWithMethods object
    const page = studio.pages.getSize();
    const pageWidth = page.width;
    const pageHeight = page.height;

    if (log) {
      console.log(`Page dimensions: ${pageWidth}w x ${pageHeight}h`);
    }

    // 2. Get the target frame by its name
    // We use studio.frames.byName() which returns a FrameWithMethods object
    const frame = studio.frames.byName(FRAME_NAME_TO_MEASURE);

    if (log) {
      console.log(
        `Found frame "${FRAME_NAME_TO_MEASURE}": x:${frame.x}, y:${frame.y}, w:${frame.width}, h:${frame.height}`,
      );
    }

    // 3. Calculate the distances

    // Distance from page top (y=0) to frame top (frame.y)
    const topDistance = frame.y;

    // Distance from page left (x=0) to frame left (frame.x)
    const leftDistance = frame.x;

    // Distance from page bottom (page.height) to frame bottom (frame.y + frame.height)
    const bottomDistance = page.height - (frame.y + frame.height);

    // Distance from page right (page.width) to frame right (frame.x + frame.width)
    const rightDistance = page.width - (frame.x + frame.width);

    // 4. Store in the requested array format: [top, left, bottom, right]
    const distances = [
      topDistance,
      leftDistance,
      bottomDistance,
      rightDistance,
    ];

    // 5. Log the final result
    if (log) {
      console.log(`Distances for frame "${FRAME_NAME_TO_MEASURE}":`);
      console.log(`- Top: ${topDistance}`);
      console.log(`- Left: ${leftDistance}`);
      console.log(`- Bottom: ${bottomDistance}`);
      console.log(`- Right: ${rightDistance}`);
      console.log("In array format [top, left, bottom, right]:", distances);
      console.log(distances);
    }

    return distances as FrameDistances;

    // Note: This calculation is based on the frame's axis-aligned
    // bounding box and does not account for frame rotation.
  } catch (error) {
    // This will catch errors, such as if the frame name is wrong
    if (log) {
      console.log(
        `Error: Could not find frame named "${FRAME_NAME_TO_MEASURE}".`,
      );
      console.log(error);
    }

    throw error;
  }
}
