// @ts-check
import van from 'vanjs-core'
import { OVERLAY_ID, savePdfLogic } from './logic.js';
import { containerStyle, contentCss, headerStyle, overlayStyle } from './styles.js';

const { div, button, input, span, label, style } = van.tags;

let isOverlayVisible = false;

const pdfBtnState = van.state('Pdf speichern');
const pdfBtnDisabled = van.state(false);
const mode = van.state('readable'); // 'readable' | 'clean'

/**
 * UI-Komponente: Das Overlay
 * @param {ArticleData} articleData
 */
function OverlayComponent(articleData) {
    const handleSave = async () => {
        pdfBtnState.val = 'Sende an Firefox...';
        pdfBtnDisabled.val = true;

        const htmlToSave = mode.val === 'readable' ? articleData.readableHtml : articleData.cleanHtml;
        const title = articleData.metadata.title || document.title;

        try {
            await savePdfLogic(htmlToSave, title);
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

    /**
    * @param {string} value 
    * @param {string} text 
    */
    const ModeRadioButton = (value, text) => label(
        { style: "margin-right: 15px; cursor: pointer; display: flex; align-items: center; gap: 5px;" },
        input({
            type: "radio",
            name: "viewMode",
            value: value,
            checked: () => mode.val === value, // Binding: Checked status reaktiv
            onclick: () => mode.val = value    // Action: State ändern
        }),
        span(text)
    );

    return div({ id: OVERLAY_ID, style: overlayStyle },
        style(contentCss),
        // Header
        div({ style: headerStyle },
            button({ onclick: hideOverlay, style: "margin-right: 10px;" }, '✖'),

            // Switcher UI
            div({ style: "display: flex; border-right: 1px solid #ccc; padding-right: 10px; margin-right: 10px;" },
                ModeRadioButton('readable', 'Leseansicht'),
                ModeRadioButton('clean', 'Original (Bereinigt)')
            ),

            button({ onclick: handleSave, disabled: pdfBtnDisabled }, pdfBtnState)
        ),

        div({ id: 'editor-content-container', style: containerStyle, class: () => mode.val === 'clean' ? 'clean-mode' : '' },
            () => {
                const contentWrapper = div();
                contentWrapper.innerHTML = mode.val === 'readable'
                    ? articleData.readableHtml
                    : articleData.cleanHtml;
                return contentWrapper;
            }
        )
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
