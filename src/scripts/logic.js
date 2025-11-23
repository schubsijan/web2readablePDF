// @ts-check
import { Readability } from '@mozilla/readability';

export const OVERLAY_ID = 'zotero-pdf-editor-overlay';

/**
 * Logik: Sendet Daten an Background Script (REIN LOGIK, KEINE UI)
 * @param {string} html
 * @param {string} title
 */
export async function savePdfLogic(html, title) {
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>${title}</title>
            <style>
                body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                img { max-width: 100%; height: auto; display: block; page-break-inside: avoid; break-inside: avoid; }
                figure { display: block; margin: 2em 0; page-break-inside: avoid; break-inside: avoid; }
                h1, h2, h3, h4, h5 { page-break-after: avoid; break-after: avoid; }
            </style>
        </head>
        <body>
            ${html}
        </body>
        </html>
    `;

    await browser.runtime.sendMessage({
        command: 'generate-pdf-native',
        html: htmlContent,
        title: title
    });
}

/**
 * Hilfsfunktion: Inhalt bereinigen (Unverändert zur Logik, nur Hilfs-DOM)
 * @param {string} htmlContent - HTML-String
 */
function adjustContent(htmlContent) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;

    const images = tempDiv.querySelectorAll('img');
    images.forEach(img => {
        if (img.src) img.src = img.src; // Absolute URLs
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.display = 'block';
    });

    return tempDiv.innerHTML;
}

/**
 * Extraktion via Readability
 * @returns {Promise<ArticleData>}
 */
export async function getReadableHtml() {
    const frameDataList = await fetchAllIframesContent();
    // 1. Klon für Readability
    const docForReadability = /** @type {Document} */ (document.cloneNode(true));
    const overlayElement = docForReadability.getElementById(OVERLAY_ID);
    if (overlayElement) overlayElement.remove();

    // 2. Klon für Clean Version (Original-Layout)
    // Wir brauchen einen frischen Klon, da Readability den DOM zerstört/verändert
    const docForClean = /** @type {Document} */ (document.cloneNode(true));
    const cleanHtmlContent = getCleanHtmlContent(docForClean, frameDataList);

    const article = new Readability(docForReadability).parse();

    // Fallback falls Readability fehlschlägt
    const title = article?.title || document.title || "Unbekannt";

    let readableHtml = "<h1>Konnte nicht extrahiert werden</h1>";

    if (article && article.content) {
        const author = article.byline ? `Von ${article.byline}` : "";
        const published = article.publishedTime ? ` | ${new Date(article.publishedTime).toLocaleDateString()}` : "";

        const headerHtml = `
            <div id="zotero-article-header" style="border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 20px;">
                <h1 style="margin: 0 0 5px 0;font-size: 30px;">${title}</h1>
                <p style="color: #555; margin: 0;font-size: 14px;">${author}${published}</p>
            </div>
        `;
        readableHtml = headerHtml + adjustContent(article.content);
    }

    return {
        metadata: article || { title: title },
        readableHtml: readableHtml,
        cleanHtml: cleanHtmlContent
    };
}

/**
 * Erstellt die "Clean Print" Version (Original ohne Header/Footer etc.)
 * @param {Document} doc
 * @param {Array<{url: string, content: string}>} frameDataList
 * @returns {string}
 */
function getCleanHtmlContent(doc, frameDataList) {
    const docClone = /** @type {Document} */ (doc.cloneNode(true));

    // Störende Elemente entfernen
    const selectorsToRemove = [
        'header', 'footer', 'nav', 'aside',
        'script', 'style', 'noscript',
        '[role="banner"]', '[role="navigation"]', '[role="contentinfo"]',
        '.cookie-banner', '#cookie-banner', '.ad', '.advertisement'
    ];

    selectorsToRemove.forEach(sel => {
        docClone.querySelectorAll(sel).forEach(el => el.remove());
    });

    // Overlay entfernen, falls mitgeklont
    const overlay = docClone.getElementById(OVERLAY_ID);
    if (overlay) overlay.remove();

    enrichFrames(docClone, doc, frameDataList);

    return docClone.body.innerHTML;
}

/**
 * Holt die Inhalte aller Iframes über das Background-Script
 */
async function fetchAllIframesContent() {
    try {
        const response = await browser.runtime.sendMessage({ command: 'collect-all-frames' });
        if (response && response.success) {
            return response.frames; // Array von {url, content}
        }
    } catch (e) {
        console.error("Konnte Frames nicht laden:", e);
    }
    return [];
}

/**
 * Überträgt Dimensionen der Original-Iframes auf die Klone und injiziert den Content.
 * @param {Document} docClone - Der Dokumenten-Klon (Ziel)
 * @param {Document} docOriginal - Das Live-Dokument (Quelle für Dimensionen)
 * @param {Array<{url: string, content: string}>} frameDataList - Die vom Background gesammelten Daten
 */
function enrichFrames(docClone, docOriginal, frameDataList) {

    // BUG das kommt mir wie der grundwätzlich falsche Weg vor
    // ich rekonstruiere hier die html, die ich eigentlich schon auf der Seite habe
    // mein Vorschlag wäre:
    // meine Bearbeitungsleiste einfach über der normalen Seite anzeigen
    // auf dieser direkt Löschungen und so machen
    // dann bei Speicher aufforderung -> Bilder so machen, dass sie nicht die Seite überbrücken
    // iframes (wie SingleFile) direkt mit in Seite einfügen
    // => so muss ich nicht den Content der Seite duplizieren in meinem eigenen Rahmen

    const originalIframes = docOriginal.querySelectorAll('iframe');
    const clonedIframes = docClone.querySelectorAll('iframe');

    clonedIframes.forEach((clonedIframe, index) => {
        const originalIframe = originalIframes[index];

        // 1. Dimensionen einfrieren ("Freezing")
        // Wir holen die Maße vom Original, da der Klon im Speicher (nicht gerendert) oft 0px hat.
        if (originalIframe) {
            try {
                const rect = originalIframe.getBoundingClientRect();

                // Nur übertragen, wenn der Iframe tatsächlich sichtbar ist
                if (rect.width > 0 && rect.height > 0) {
                    clonedIframe.style.width = `${rect.width}px`;
                    clonedIframe.style.height = `${rect.height}px`;
                    // Wichtig: Überschreibt CSS-Regeln, die evtl. stören
                    clonedIframe.style.minHeight = '0';
                    clonedIframe.style.maxHeight = 'none';
                }
            } catch (e) {
                // Kann passieren bei Cross-Origin Problemen in manchen Browser-Kontexten, 
                // aber getBoundingClientRect ist meist sicher.
                console.warn("Konnte Dimensionen nicht lesen:", e);
            }
        }

        // 2. Content Injection (srcdoc)
        const iframeSrc = clonedIframe.src;

        // Wir suchen den passenden Content anhand der URL
        const foundFrame = frameDataList.find(f => f.url === iframeSrc);

        if (foundFrame) {
            // Inhalt gefunden -> srcdoc setzen
            clonedIframe.removeAttribute('src');
            clonedIframe.setAttribute('srcdoc', foundFrame.content);

            clonedIframe.style.border = 'none';
            clonedIframe.style.display = 'block';
        } else {
            // Fallback: URL absolut machen, falls wir den Inhalt nicht scrapen konnten
            if (clonedIframe.src) {
                try {
                    clonedIframe.src = new URL(clonedIframe.src, docOriginal.baseURI).href;
                } catch (e) { }
            }
        }
    });
}
