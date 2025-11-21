import { Readability } from '@mozilla/readability';
import domtoimage from "dom-to-image-more";

const OVERLAY_ID = 'zotero-pdf-editor-overlay';
let isOverlayVisible = false;

/**
 * Erstellt und zeigt das Overlay mit dem bereinigten HTML-Content an.
 * @param {object} articleData - Das vollständige Objekt von getReadableHtml().
 */
function showOverlay(articleData) {
    if (document.getElementById(OVERLAY_ID)) return; // Overlay ist schon da

    // 1. Erstelle das Overlay-Element
    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;

    // Einfache CSS-Styles für das Overlay (könnte in eine separate CSS-Datei ausgelagert werden)
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

    // 2. Erstelle den Content-Container (damit nur dieser scrollt und bearbeitet werden kann)
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
    // 3. Füge dem Overlay den Content hinzu
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

    // 1. Bilder anpassen (maximal 10% der Breite)
    const images = tempDiv.querySelectorAll('img');
    images.forEach(img => {
        // --- WICHTIG: Relative URLS in absolute umwandeln ---
        // Die 'src'-Eigenschaft des DOM-Elements (nicht das Attribut) gibt immer die absolute URL zurück.
        if (img.src) {
            img.src = img.src; // Überschreiben mit dem absoluten Wert (funktioniert oft implizit)
        }

        img.style.maxWidth = '100%';
        img.style.padding = 'auto';
        img.style.height = 'auto'; // Verhindert Verzerrung
        img.style.display = 'block'; // Für bessere Platzierung
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
        // WICHTIG: Cleanup-Funktion für Zotero-Blob-URL aufrufen, falls nötig.
        // this.pdfInjector.cleanup(); // Später hier integrieren
    }
}

/**
 * Bereinigt die aktuelle Seite mit Readability, reichert Metadaten an und gibt den HTML-Content zurück.
 * @returns {{metadata: object, html: string, contentElement: HTMLElement}} Ein Objekt mit Metadaten und dem Content.
 */
async function getReadableHtml() {
    // 1. Klonen Sie das Dokument, um das Original-DOM nicht zu verändern
    const documentClone = document.cloneNode(true);

    // Entferne Dein eigenes Overlay, falls es existiert (sauberer Klon)
    const overlayElement = documentClone.getElementById(OVERLAY_ID);
    if (overlayElement) {
        overlayElement.remove();
    }

    // 2. Readability ausführen und Metadaten extrahieren
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
            <h1 style="font-size: 2em; margin: 0 0 5px 0;">${title}</h1>
            <p style="font-size: 0.8em; color: #555; margin: 0;">${author} | ${published}</p>
        </div>
    `;

    // 4. Content anpassen (Bilder, etc.)
    const tempDivForAdjust = document.createElement('div');
    tempDivForAdjust.innerHTML = article.content;

    const adjustedContent = adjustContent(tempDivForAdjust.innerHTML);

    // 5. Kombiniere Header und Content
    const fullHtml = headerHtml + adjustedContent;

    // 6. Erstelle einen DOM-Container für die Übergabe an das Overlay (für das Lösch-Tool)
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

    // Wir senden das komplette HTML an das Background-Script
    // Wir packen es in eine vollständige HTML-Struktur, damit Styles stimmen
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>${articleData.metadata.title}</title>
            <style>
                body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                img { max-width: 100%; height: auto; }
                /* Hier kannst du noch mehr CSS für das PDF definieren */
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

/**
 * Sendet URLs an background.js und erhält Base64 zurück.
 * Umgeht CSP und CORS der Webseite.
 */
async function replaceImagesWithBase64(container) {
    const images = container.querySelectorAll('img');

    const promises = Array.from(images).map(async (img) => {
        const originalSrc = img.src;

        // Wenn kein src da ist oder es schon data: ist, überspringen
        if (!originalSrc || originalSrc.startsWith('data:')) return;

        try {
            // Nachricht an Background senden
            const response = await browser.runtime.sendMessage({
                command: 'fetch-image-as-base64',
                url: originalSrc
            });

            if (response && response.success) {
                img.src = response.data;
                // Markiere für html2canvas, dass dieses Bild sicher ist
                img.setAttribute('data-html2canvas-ignore', 'false');
            } else {
                console.warn("Bild-Fetch fehlgeschlagen:", originalSrc, response?.error);
                img.remove(); // Kaputtes Bild entfernen, damit PDF nicht crasht
            }
        } catch (error) {
            console.error("Kommunikationsfehler mit Background-Script:", error);
            img.remove();
        }
    });

    await Promise.all(promises);
}

/**
 * Ersetzt ALLE Iframes durch statische Platzhalter-Divs.
 * Verhindert SecurityError in html2canvas und bewahrt das Layout.
 */
function flattenIframes(container) {
    const iframes = container.querySelectorAll('iframe, frame, embed, object');

    iframes.forEach(iframe => {
        try {
            // Abmessungen retten, damit das Layout im PDF nicht springt
            const width = iframe.offsetWidth || iframe.width || 300;
            const height = iframe.offsetHeight || iframe.height || 200;

            // Quelle retten (src oder data-src für Lazy Loading)
            const src = iframe.src || iframe.getAttribute('data-src') || iframe.getAttribute('data-original') || '';

            // Platzhalter erstellen
            const placeholder = document.createElement('div');

            // Styling: Soll aussehen wie ein grauer Kasten im PDF
            placeholder.style.cssText = `
                width: ${width}px;
                height: ${height}px;
                max-width: 100%;
                background-color: #f0f0f0;
                border: 1px solid #ccc;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                margin: 10px auto;
                font-family: sans-serif;
                color: #555;
                text-align: center;
                padding: 10px;
                box-sizing: border-box;
            `;

            // Inhalt des Platzhalters
            let contentHtml = `<div style="font-weight:bold; margin-bottom:5px;">Externer Inhalt</div>`;

            if (src && src.startsWith('http')) {
                // Link kürzen für die Optik
                const urlObj = new URL(src);
                const domain = urlObj.hostname.replace('www.', '');

                contentHtml += `
                    <div style="font-size: 0.8em;">${domain}</div>
                    <a href="${src}" target="_blank" style="color: #0066cc; font-size: 0.7em; margin-top: 5px; word-break: break-all;">${src.substring(0, 40)}...</a>
                `;
            } else {
                contentHtml += `<div style="font-size: 0.8em;">Inhalt nicht verfügbar</div>`;
            }

            placeholder.innerHTML = contentHtml;

            // Austausch vornehmen
            iframe.parentNode.replaceChild(placeholder, iframe);

        } catch (e) {
            console.warn("Konnte Iframe nicht ersetzen:", e);
            // Im Notfall Iframe löschen, damit PDF nicht abstürzt
            iframe.remove();
        }
    });
}

/**
 * Entfernt alle CSS-Hintergrundbilder, um CORS-Fehler zu vermeiden.
 * html2canvas versucht sonst, diese zu laden, was zum SecurityError führt.
 */
function removeBackgroundImages(container) {
    const allElements = container.querySelectorAll('*');

    allElements.forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.backgroundImage && style.backgroundImage !== 'none') {
            // Prüfen, ob es eine URL ist (und kein linear-gradient o.ä.)
            if (style.backgroundImage.includes('url(')) {
                // Wir entfernen das Hintergrundbild, um sicherzugehen
                el.style.backgroundImage = 'none';
                // Optional: Hintergrundfarbe setzen, damit Text lesbar bleibt
                el.style.backgroundColor = '#ffffff';
            }
        }
    });
}

if (typeof global === "undefined") {
    window.global = window;
}
