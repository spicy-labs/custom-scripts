/**
 * Workaround for studio.frame.setImageFromUrl.
 *
 * Images placed with setImageFromUrl ignore the image frame's container settings in the
 * editor and in page snapshots: stroke, corner radius and clipping shape aren't drawn.
 * Images that come from a media connector are drawn with them. This helper loads a URL
 * through the CHILI "URL Connector" instead, so the frame keeps its stroke and clipping.
 *
 * Setup (once per environment):
 *   1. Add the URL Connector to the GraFx environment and enable it.
 *   2. Add the domains your images are served from to the connector's allowed domains.
 *      Include any domain the URL redirects to (for example picsum.photos redirects
 *      to fastly.picsum.photos).
 *   3. Copy the connector's id from the environment and pass it as urlConnectorId.
 *
 * Usage, where `studio` is your StudioSDK instance:
 *   await setImageFromUrlViaConnector(studio, imageFrameId, 'https://example.com/photo.jpg', URL_CONNECTOR_ID);
 *
 * How it works: the URL Connector reads the image URL from its context (`url`), and a
 * connector's context applies to the whole connector instance in the document, not to one
 * frame. So each frame gets its own instance of the URL Connector, registered in the
 * document, with the URL set as a value mapping. Calling the helper again for the same
 * frame reuses that frame's instance and only changes the URL. The instances are saved with
 * the document, so the image also loads when the document is reopened.
 */
async function setImageFromUrlViaConnector(studio, imageFrameId, url, urlConnectorId) {
    const ok = (res, what) => {
        if (!res || !res.success) throw new Error(`${what} failed: ${JSON.stringify(res)}`);
        return res.parsedData;
    };

    // Reuse this frame's URL Connector instance if it already has one that no other frame uses.
    let instanceId = null;
    const frame = ok(await studio.frame.getById(imageFrameId), 'frame.getById');
    if (frame.src && frame.src.type === 'connector') {
        const current = await studio.connector.getById(frame.src.id);
        // The SDK reports a GraFx connector's source as { source: 'grafx', url: '.../connectors/<id>' }
        // (older SDKs as { source: 'grafx', id: '<id>' }), so accept both.
        const source = (current.success && current.parsedData && current.parsedData.source) || {};
        const isUrlConnector = source.id === urlConnectorId
            || String(source.url || '').endsWith(`/connectors/${urlConnectorId}`);
        if (isUrlConnector) {
            const frames = ok(await studio.frame.getAll(), 'frame.getAll');
            const sharedWith = [];
            for (const f of frames) {
                if (f.id === imageFrameId || f.type !== 'image') continue;
                const other = ok(await studio.frame.getById(f.id), 'frame.getById');
                if (other.src && other.src.type === 'connector' && other.src.id === frame.src.id) sharedWith.push(f.id);
            }
            if (sharedWith.length === 0) instanceId = frame.src.id;
        }
    }

    // Otherwise register a new instance of the URL Connector for this frame.
    if (!instanceId) {
        instanceId = ok(await studio.connector.register({ source: 'grafx', id: urlConnectorId }), 'connector.register');
    }

    // Give the instance the image URL. The connector downloads context.url.
    ok(await studio.connector.configure(instanceId, async (configurator) => {
        ok(await configurator.setMappings([
            { name: 'url', value: url, type: 'value', direction: 'engineToConnector' },
        ]), 'setMappings');
    }), 'connector.configure');

    // The URL doubles as the asset id, so a new URL is a new asset and is downloaded again.
    return ok(await studio.frame.setImageFromConnector(imageFrameId, instanceId, url), 'frame.setImageFromConnector');
}
