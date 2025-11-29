// @ts-check
import van from 'vanjs-core'
import { overlayStyle, headerStyle, printCss } from './styles.js';

// ID, damit wir das Overlay finden und auch per CSS ausblenden können
const OVERLAY_ID = 'zotero-pdf-editor-overlay';

const { div, button, style, span } = van.tags;

let isOverlayVisible = false;
const pdfBtnState = van.state('Seite speichern');
const pdfBtnDisabled = van.state(false);

/**
 * UI-Komponente: Nur noch die Header-Leiste
 * * @param {() => Promise<{success: boolean, error?: string}>} onSave 
 */
function OverlayComponent(onSave) {

    const handleSave = async () => {
        pdfBtnState.val = 'Verarbeite...';
        pdfBtnDisabled.val = true;

        try {
            // 2. Wir rufen die übergebene Funktion auf, statt direkt zu senden
            // Diese Funktion gibt uns das Ergebnis zurück (Erfolg/Fehler)
            const result = await onSave();

            if (result && result.success) {
                pdfBtnState.val = 'Gespeichert!';
            } else {
                pdfBtnState.val = 'Fehler!';
            }
        } catch (e) {
            console.error(e);
            pdfBtnState.val = 'Error';
        } finally {
            setTimeout(() => {
                pdfBtnDisabled.val = false;
                pdfBtnState.val = 'Seite speichern';
            }, 2000);
        }

    };

    return div({ id: OVERLAY_ID, style: overlayStyle },
        // Wir injizieren die Print-CSS direkt in das Overlay
        style(printCss),

        div({ style: headerStyle },
            span({ style: "font-weight: bold; margin-right: 10px;" }, "Web2PDF"),
            button({ onclick: handleSave, disabled: pdfBtnDisabled }, pdfBtnState)
        ),

        button({ onclick: hideOverlay, style: "background: transparent; border: none; font-size: 1.2em; cursor: pointer;" }, '✖')
    );
}

/**
 * Zeigt das Overlay an und bereitet die Seite für den Druck vor (versteckt Header/Footer etc.).
 * * @param {() => Promise<{success: boolean, error?: string}>} onSaveCallback 
 */
export function showOverlay(onSaveCallback) {
    if (document.getElementById(OVERLAY_ID)) return;

    document.body.setAttribute("web2readablePDF-overlay-visible", "")

    const selectorsToHide = [
        'header', 'footer', 'nav', 'aside',
        'script', 'style', 'noscript',
        '[role="banner"]', '[role="navigation"]', '[role="contentinfo"]',
        '.cookie-banner', '#cookie-banner', '.ad', '.advertisement'
    ];
    selectorsToHide.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => el.setAttribute("web2readablePDF-hide", ""));
    });

    const overlay = OverlayComponent(onSaveCallback)
    van.add(document.body, overlay);

    isOverlayVisible = true;
}

export function hideOverlay() {
    document.body.removeAttribute("web2readablePDF-overlay-visible")
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
        overlay.remove();
        isOverlayVisible = false;
    }
}

export function getOverlayState() {
    return isOverlayVisible;
}
