import { Readability } from '@mozilla/readability';

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
    addPdfBtn.textContent = 'Pdf einbetten';
    addPdfBtn.addEventListener('click', () => embedPdf(addPdfBtn, articleData));
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

    // Asynchron auf die Konvertierung warten
    const processedDiv = await convertImagesToBase64(tempDivForAdjust);
    const adjustedContent = adjustContent(processedDiv.innerHTML);

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
function embedPdf(saveBtn, articleData) {
    // Zustand des Buttons ändern
    saveBtn.textContent = 'PDF wird erstellt...';
    saveBtn.disabled = true;

    // Sende den bereinigten HTML-Inhalt an das Hintergrundskript
    browser.runtime.sendMessage({
        command: "generate-pdf",
        htmlContent: articleData.html
    })
        .then(response => {
            if (response.pdfBlobUrl) {
                // PDF-Erstellung erfolgreich, jetzt einbetten
                console.log("PDF-Blob-URL erhalten. Einbettung...");
                console.log("pdfblob", response.pdfBlobUrl);
                embedHiddenZoteroLink(saveBtn, response.pdfBlobUrl, articleData.metadata.title);
            } else {
                // Fehlerbehandlung
                console.error("Fehler bei der PDF-Erstellung:", response.error);
                saveBtn.textContent = '❌ Fehler. Erneut versuchen.';
                saveBtn.disabled = false;
            }
        })
        .catch(error => {
            console.error("Fehler beim Senden der Nachricht an das Hintergrundskript:", error);
            saveBtn.textContent = '❌ Kommunikationsfehler.';
            saveBtn.disabled = false;
        });
}

/**
 * Ersetzt den Save-Button durch einen versteckten Link, den Zotero parsen kann.
 * @param {HTMLElement} saveBtn - Der Save-Button.
 * @param {string} pdfBlobUrl - Die URL des generierten PDF-Blobs.
 */
function embedHiddenZoteroLink(saveBtn, pdfBlobUrl, title) {
    const parent = saveBtn.parentNode;

    // 1. Erstelle den versteckten Link
    const zoteroLink = document.createElement('a');
    zoteroLink.id = 'zotero-pdf-download-link';
    zoteroLink.href = pdfBlobUrl;

    // WICHTIG: Setze den Dateinamen für den Download
    zoteroLink.download = `${title.replace(/[^a-z0-9]/gi, '_')}.pdf`;

    // 2. Mache den Link unsichtbar, aber im DOM vorhanden
    zoteroLink.style.display = 'none';

    // 3. Füge den Link dem DOM hinzu (z.B. am Body oder Header-Container)
    parent.appendChild(zoteroLink);

    // 4. Status-Update für den Benutzer
    saveBtn.textContent = '📥 PDF-Link bereit (Warten auf Zotero)';
    saveBtn.disabled = true;

    console.log("Versteckter Zotero-Link erstellt mit Blob-URL:", pdfBlobUrl);
}

async function convertImagesToBase64(tempDiv) {
    const images = tempDiv.querySelectorAll('img');
    const promises = [];

    images.forEach(img => {
        promises.push(new Promise(resolve => {
            // 1. Erstelle ein temporäres Canvas-Element
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const image = new Image();

            // Behandeln Sie Cross-Origin-Bilder, falls möglich
            image.crossOrigin = "Anonymous";

            // Verwende die absolute URL der Quelle
            image.src = img.src;

            image.onload = () => {
                canvas.width = image.naturalWidth;
                canvas.height = image.naturalHeight;
                ctx.drawImage(image, 0, 0);

                // Konvertiere zu Data URL (hier WebP, wie gewünscht)
                const dataUrl = canvas.toDataURL('image/webp', 0.9);

                img.src = dataUrl;
                resolve();
            };

            // Wichtig: Fehler bei nicht ladbaren Bildern behandeln
            image.onerror = () => {
                console.warn("Bild konnte nicht geladen oder konvertiert werden:", img.src);
                // Bild durch ein 1x1 Pixel ersetzen oder entfernen
                img.remove();
                resolve();
            };
        }));
    });

    await Promise.all(promises);
    return tempDiv; // Gibt das DOM mit Base64-Bildern zurück
}
