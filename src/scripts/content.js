import { Readability } from '@mozilla/readability';

const OVERLAY_ID = 'zotero-pdf-editor-overlay';
let isOverlayVisible = false;

/**
 * Erstellt und zeigt das Overlay mit dem bereinigten HTML-Content an.
 * @param {object} articleData - Das vollständige Objekt von getReadableHtml().
 */
function showOverlay(articleData) {
    if (document.getElementById(OVERLAY_ID)) return;

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;

    overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: white;
    z-index: 99999;
    overflow-y: auto;
    padding: 20px;
    box-sizing: border-box;
    font-family: Arial, sans-serif;
`;

    const contentContainer = document.createElement('div');
    contentContainer.id = 'editor-content-container';
    contentContainer.style.cssText = `width: 90%;height: 100%;overflow-y: scroll;margin: auto;`;
    contentContainer.innerHTML = articleData.html;

    const hideBtn = document.createElement('button');
    hideBtn.textContent = '✖';
    hideBtn.addEventListener('click', () => hideOverlay());
    const addPdfBtn = document.createElement('button');
    addPdfBtn.textContent = 'Pdf speichern';
    addPdfBtn.addEventListener('click', () => savePdf(addPdfBtn, articleData));
    const overlayHeader = document.createElement('div');
    overlayHeader.style.width = '100%'

    overlayHeader.appendChild(hideBtn);
    overlayHeader.appendChild(addPdfBtn);
    overlay.appendChild(overlayHeader)
    overlay.appendChild(contentContainer);
    document.body.appendChild(overlay);

    isOverlayVisible = true;
    console.log("Overlay erstellt und Readability-Content geladen.");
}

/**
 * Anpassen des HTML-Contents nach der Extraktion durch @mozilla/readability.js
 */
function adjustContent(htmlContent) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;

    const images = tempDiv.querySelectorAll('img');
    images.forEach(img => {
        // Relative URLS in absolute umwandeln ---
        // Die 'src'-Eigenschaft des DOM-Elements (nicht das Attribut) gibt immer die absolute URL zurück.
        if (img.src) {
            img.src = img.src;
        }

        img.style.maxWidth = '100%';
        img.style.padding = 'auto';
        img.style.height = 'auto';
        img.style.display = 'block';
    });

    return tempDiv.innerHTML;
}

/**
 * Entfernt das Overlay von der Seite.
 */
function hideOverlay() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
        overlay.remove();
        isOverlayVisible = false;
        console.log("Overlay entfernt.");
    }
}

/**
 * Bereinigt die aktuelle Seite mit Readability, reichert Metadaten an und gibt den HTML-Content zurück.
 * @returns {{metadata: object, html: string, contentElement: HTMLElement}} Ein Objekt mit Metadaten und dem Content.
 */
async function getReadableHtml() {
    const documentClone = document.cloneNode(true);

    // Entferne des eigenen Overlays, falls es existiert (sauberer Klon)
    const overlayElement = documentClone.getElementById(OVERLAY_ID);
    if (overlayElement) {
        overlayElement.remove();
    }

    const article = new Readability(documentClone).parse();

    if (!article || !article.content) {
        return {
            metadata: { title: "Artikel konnte nicht extrahiert werden." },
            html: "<h1>Artikel konnte nicht extrahiert werden.</h1>",
            contentElement: null
        };
    }

    // 3. Metadaten-Header erstellen
    const title = article.title || "Titel unbekannt";
    const author = article.byline ? `Von ${article.byline}` : "Autor unbekannt";
    const published = article.publishedTime ? `Veröffentlicht: ${new Date(article.publishedTime).toLocaleDateString()}` : "Datum unbekannt";

    const headerHtml = `
        <div id="zotero-article-header" style="margin-bottom: 10; border-bottom: 2px solid #ccc; padding-bottom: 10px;">
            <h1 style="font-size: 1.5em; margin: 0 0 5px 0;">${title}</h1>
            <p style="font-size: 0.8em; color: #555; margin: 0;">${author} | ${published}</p>
        </div>
    `;

    const tempDivForAdjust = document.createElement('div');
    tempDivForAdjust.innerHTML = article.content;

    const adjustedContent = adjustContent(tempDivForAdjust.innerHTML);

    const fullHtml = headerHtml + adjustedContent;

    const contentContainer = document.createElement('div');
    contentContainer.innerHTML = fullHtml;

    return {
        metadata: article,
        html: fullHtml,
        contentElement: contentContainer
    };
}


// Haupt-Message-Listener
browser.runtime.onMessage.addListener(async (message) => {
    if (message.command === "toggle-editor") {
        if (isOverlayVisible) {
            hideOverlay();
        } else {
            const articleData = await getReadableHtml();
            showOverlay(articleData);
        }
    }
});

// Initialer Konsolen-Log beim Laden
console.log("Zotero PDF Trim Content Script bereit.");

/**
 * Sendet den bereinigten HTML-Content an das Hintergrundskript zur PDF-Erstellung.
 * Bei Erfolg wird das Overlay durch das PDF ersetzt.
 * @param {HTMLElement} saveBtn - Der Save-Button, um seinen Zustand zu ändern.
 * @param {object} articleData - Das vollständige Objekt von getReadableHtml().
 */
async function savePdf(saveBtn, articleData) {
    saveBtn.textContent = 'Sende an Firefox...';
    saveBtn.disabled = true;

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>${articleData.metadata.title}</title>
            <style>
                body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                img { max-width: 100%; height: auto; display: block; page-break-inside: avoid; break-inside: avoid; }
                figure { display: block; margin: 2em 0; page-break-inside: avoid; break-inside: avoid; }
                figure a, figure picture { display: block; }
                h1, h2, h3, h4, h5 { page-break-after: avoid; break-after: avoid; }
            </style>
        </head>
        <body>
            ${articleData.html}
        </body>
        </html>
    `;

    try {
        await browser.runtime.sendMessage({
            command: 'generate-pdf-native',
            html: htmlContent,
            title: articleData.metadata.title
        });
        saveBtn.textContent = 'PDF gespeichert!';
    } catch (e) {
        console.error(e);
        saveBtn.textContent = 'Fehler';
    } finally {
        setTimeout(() => { saveBtn.disabled = false; saveBtn.textContent = 'Pdf speichern'; }, 2000);
    }
}
