// ================= CONFIGURATION =================

// 1. Margin that grows in WIDTH but stays anchored to the LEFT (Single Value)
const leftAlignedVertical = "Margin_Left";

// 2. Margin that grows in HEIGHT but stays anchored to the TOP (Single Value)
const topAlignedHorizontal = "Margin_Top";

// 3. Margins that grow in WIDTH and must SHIFT LEFT (Still an Array)
const rightAlignedVerticals = ["Margin_Right"];

// 4. Margins that grow in HEIGHT and must SHIFT UP (Still an Array)
const bottomAlignedHorizontals = ["Margin_Bottom"];

// 5. The special corner frame
const cornerFrameName = "Corner";

// =================================================

// 1. Get the previous thickness from the static Corner frame
const oldThickness = getFrameWidth(cornerFrameName);

// 2. REFERENCE CHECK: Use the single variables defined above
const currentMarginWidth = getFrameWidth(leftAlignedVertical);
const currentMarginHeight = getFrameHeight(topAlignedHorizontal);

// 3. Calculate the Delta (Difference)
const deltaWidth = Math.abs(currentMarginWidth - oldThickness);
const deltaHeight = Math.abs(currentMarginHeight - oldThickness);

let widthChanged = true;
let targetThickness = currentMarginWidth;

// 4. Determine the Target Thickness
if (deltaHeight > deltaWidth) {
    targetThickness = currentMarginHeight;
    widthChanged = false;
}

// 5. Calculate the Shift Amount (The "Correction")
// Positive = Growing (Needs to move back). Negative = Shrinking (Needs to move forward).
const thicknessDifference = targetThickness - oldThickness;

// ================= APPLYING CHANGES =================

// 6. Left Aligned Vertical (Set Width Only - No Loop)
setFrameWidth(leftAlignedVertical, targetThickness);

// 7. Top Aligned Horizontal (Set Height Only - No Loop)
setFrameHeight(topAlignedHorizontal, targetThickness);

// 8. Loop: Right Aligned Verticals (Set Width + Adjust X)
for (let i = 0; i < rightAlignedVerticals.length; i++) {
    const frameName = rightAlignedVerticals[i];
    const currentX = getFrameX(frameName);
    
    setFrameWidth(frameName, targetThickness);
    if (!widthChanged) {
        setFrameX(frameName, currentX - thicknessDifference);
    }
}

// 9. Loop: Bottom Aligned Horizontals (Set Height + Adjust Y)
for (let i = 0; i < bottomAlignedHorizontals.length; i++) {
    const frameName = bottomAlignedHorizontals[i];
    const currentY = getFrameY(frameName);
    
    setFrameHeight(frameName, targetThickness);
    if (widthChanged) {
        setFrameY(frameName, currentY - thicknessDifference);
    }
}

// 10. Update the Corner
setFrameWidth(cornerFrameName, targetThickness);
setFrameHeight(cornerFrameName, targetThickness);
setFrameX(cornerFrameName, 0);
setFrameY(cornerFrameName, 0);
