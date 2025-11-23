// @ts-check
import { getReadableHtml } from './logic.js';
import { showOverlay, hideOverlay, getOverlayState } from './ui.js';

const isTopFrame = window === window.top;

if (isTopFrame) {
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
} else {
    // === LOGIK FÜR IFRAMES (FLOURISH, YOUTUBE etc.) ===
    // Wir warten nur auf die Frage: "Gib mir deinen Content!"

    browser.runtime.onMessage.addListener((message, _, sendResponse) => {
        if (message.command === "get-frame-content") {
            // Wir senden unser komplettes HTML zurück
            // Plus die URL, damit das Hauptfenster weiß, wer wir sind.
            sendResponse({
                url: window.location.href,
                content: document.documentElement.outerHTML
            });
        }
    });
}
