// @ts-check
import { getReadableHtml } from './logic.js';
import { showOverlay, hideOverlay, getOverlayState } from './ui.js';

// Message Listener
browser.runtime.onMessage.addListener(async (message) => {
    if (message.command === "toggle-editor") {
        if (getOverlayState()) {
            hideOverlay();
        } else {
            const articleData = await getReadableHtml();
            showOverlay(articleData);
        }
    }
});

console.log("Zotero Content Script (VanJS) bereit.");
