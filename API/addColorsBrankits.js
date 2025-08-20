async function updateBrandKitColors(environment, brand_kit_id, auth_token, hexColors) {

  // 1. Construct the API URL from the function parameters
  const apiUrl = `https://${environment}.chili-publish.online/grafx/api/v1/environment/${environment}/brand-kits/${brand_kit_id}`;

  // 2. Set up the authorization headers for the requests
  const headers = {
    'Authorization': `Bearer ${auth_token}`,
    'Content-Type': 'application/json' // Needed for the PUT request
  };

  try {
    // 3. Make the GET call to fetch the current brand kit data
    console.log(`Fetching brand kit with ID: ${brand_kit_id}...`);
    const getResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${auth_token}`
      }
    });

    if (!getResponse.ok) {
      throw new Error(`Failed to fetch brand kit. Status: ${getResponse.status} ${getResponse.statusText}`);
    }

    const brandKitData = await getResponse.json();
    console.log(`Successfully fetched brand kit: "${brandKitData.name}"`);

    // 4. Create the new colors array from the provided hexColors
    const newColors =  removeDuplicateStrings(hexColors).map(hex => ({
      value: hex,
      displayValue: null,
      name: hex, // Use the hex value as the name by default
      type: "hex",
      guid: generateGUID() // Assign a new, unique GUID
    }));
    console.log(`Generated ${newColors.length} new color objects.`);

    // 5. Replace the colors array in the fetched data
    brandKitData.colors = newColors;

    // 6. Make the PUT call to update the brand kit with the modified data
    console.log('Sending updated brand kit data to the server...');
    const putResponse = await fetch(apiUrl, {
      method: 'PUT',
      headers: headers,
      body: JSON.stringify(brandKitData)
    });

    if (!putResponse.ok) {
      // Try to get more error details from the body
      const errorBody = await putResponse.text();
      throw new Error(`Failed to update brand kit. Status: ${putResponse.status}. Body: ${errorBody}`);
    }

    const updatedBrandKit = await putResponse.json();
    console.log('✅ Brand kit updated successfully!');
    
    // 7. Return the final, updated brand kit object from the server
    return updatedBrandKit;

  } catch (error) {
    console.error('❌ An error occurred during the brand kit update process:', error);
    // Re-throw the error so the calling code can handle it
    throw error;
  }
}

function generateGUID() {
  // crypto.randomUUID() is available in secure contexts (HTTPS) in all modern browsers.
  if (crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for older browsers or non-secure contexts (not recommended for production)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function removeDuplicateStrings(inputArray) {
  const seenStrings = new Set(); // To keep track of strings we've already encountered
  const uniqueStrings = [];      // To store the unique strings in order

  for (const item of inputArray) {
    // Check if the item is a string and if we haven't seen it before
    if (typeof item === 'string' && !seenStrings.has(item)) {
      seenStrings.add(item);     // Mark this string as seen
      uniqueStrings.push(item);  // Add it to our result array
    }
    // You can optionally add an 'else' block here to handle non-string items
    // if you need to do something with them (e.g., skip them, log a warning).
  }

  return uniqueStrings;
}
