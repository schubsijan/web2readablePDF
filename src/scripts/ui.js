// @ts-check
import van from 'vanjs-core'
import { OVERLAY_ID, savePdfLogic } from './logic.js';
import { containerStyle, headerStyle, overlayStyle } from './styles.js';

const { div, button } = van.tags;

let isOverlayVisible = false;

const pdfBtnState = van.state('Pdf speichern');
const pdfBtnDisabled = van.state(false);

/**
 * UI-Komponente: Das Overlay
 * @param {ArticleData} articleData
 */
function OverlayComponent(articleData) {
    const handleSave = async () => {
        pdfBtnState.val = 'Sende an Firefox...';
        pdfBtnDisabled.val = true;

        try {
            await savePdfLogic(articleData);
            pdfBtnState.val = 'PDF gespeichert!';
        } catch (e) {
            console.error(e);
            pdfBtnState.val = 'Fehler';
        } finally {
            setTimeout(() => {
                pdfBtnDisabled.val = false;
                pdfBtnState.val = 'Pdf speichern';
            }, 2000);
        }
    };

    return div({ id: OVERLAY_ID, style: overlayStyle },
        div({ style: headerStyle },
            button({ onclick: hideOverlay }, '✖'),
            button({ onclick: handleSave, disabled: pdfBtnDisabled }, pdfBtnState)
        ),
        div({ id: 'editor-content-container', style: containerStyle, innerHTML: articleData.html })
    );
}

/**
 * Erstellt und zeigt das Overlay (Einstiegspunkt)
 * @param {ArticleData} articleData 
 */
export function showOverlay(articleData) {
    if (document.getElementById(OVERLAY_ID)) return;

    const overlay = OverlayComponent(articleData);
    van.add(document.body, overlay);

    isOverlayVisible = true;
    console.log("Overlay erstellt und Content geladen.");
}

/**
 * Entfernt das Overlay
 */
export function hideOverlay() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
        overlay.remove();
        isOverlayVisible = false;
        console.log("Overlay entfernt.");
    }
}

export function getOverlayState() {
    return isOverlayVisible;
}
