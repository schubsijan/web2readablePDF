// Event-Listener für den Klick auf das Addon-Icon
browser.action.onClicked.addListener((tab) => {
    // Sende eine Nachricht an das Content-Skript des aktuellen Tabs
    browser.tabs.sendMessage(tab.id, {
        command: "toggle-editor"
    }).catch(error => {
        // Falls die Seite noch kein Content-Skript hat (was bei Manifest V3 vorkommen kann)
        console.error("Fehler beim Senden der Nachricht:", error);
    });
});

browser.runtime.onMessage.addListener((message) => {
    if (message.command === "generate-pdf") {
        return handlePdfGeneration(message.htmlContent);
    }
});

/**
 * Generiert ein PDF aus dem HTML-Inhalt und gibt die Blob-URL zurück.
 * @param {string} htmlContent - Der bereinigte HTML-Inhalt.
 * @returns {Promise<object>} Ein Promise, das mit { pdfBlobUrl: string } oder { error: string } aufgelöst wird.
 */
async function handlePdfGeneration(htmlContent) {
    if (typeof jsPDF === 'undefined') {
        console.error("Fehler beim dynamischen Laden der PDF-Bibliotheken");
        return { error: "PDF-Bibliotheken konnten nicht geladen werden." };
    }
    // 1. Erstelle ein temporäres DOM-Element aus dem empfangenen HTML-String
    const tempElement = document.createElement('div');
    tempElement.innerHTML = htmlContent;

    // Optional: Füge Styles hinzu, die für jsPDF.html() wichtig sind
    // Z.B. für die korrekte Font-Größe und Margin-Behandlung
    tempElement.style.width = '210mm'; // A4-Breite für korrekte Skalierung
    tempElement.style.padding = '10mm';

    try {
        // 2. Initialisiere jsPDF
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
        });

        // 3. Generiere das PDF asynchron mit echtem Text
        return new Promise((resolve, reject) => {

            // Verwende jsPDF.html() mit dem temporären Element
            pdf.html(tempElement, {
                callback: (generatedPdf) => {
                    try {
                        // 4. Generiere den Blob und die URL
                        const pdfBlob = generatedPdf.output('blob');
                        const pdfBlobUrl = URL.createObjectURL(pdfBlob);

                        console.log('✓ jsPDF generiert mit selectierbarem Text');
                        resolve({ pdfBlobUrl: pdfBlobUrl });
                    } catch (e) {
                        reject(e);
                    }
                },

                // Konfiguration aus Ihrem Beispiel übernommen und leicht angepasst:
                margin: [10, 10, 10, 10],
                autoPaging: 'text',
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    letterRendering: true
                },
                jsPDF: {
                    format: 'a4'
                },

                // Error-Handling im Callback
                error: (error) => {
                    reject(new Error(`jsPDF-Generierungsfehler: ${error}`));
                }
            });
        });

    } catch (error) {
        console.error("PDF-Generierung (jsPDF) fehlgeschlagen:", error);
        return { error: error.message };
    }
}
