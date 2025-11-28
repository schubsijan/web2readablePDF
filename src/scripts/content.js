// @ts-check
import { showOverlay, hideOverlay, getOverlayState } from './ui.js';

const isTopFrame = window === window.top;

if (isTopFrame) {
    browser.runtime.onMessage.addListener((message) => {
        if (message.command === "toggle-editor") {
            if (getOverlayState()) {
                hideOverlay();
            } else {
                // Einfach nur anzeigen, keine Berechnung nötig
                showOverlay();
            }
        }
    });
}
