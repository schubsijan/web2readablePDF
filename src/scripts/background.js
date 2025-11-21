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

browser.runtime.onMessage.addListener(async (message, sender) => {
    if (message.command === 'generate-pdf-native') {

        let tabId = null;
        let url = null;

        try {
            console.log("Start: Erzeuge PDF...");

            // 1. Blob URL erstellen
            const htmlBlob = new Blob([message.html], { type: 'text/html' });
            url = URL.createObjectURL(htmlBlob);

            // 2. Tab erstellen und AKTIV schalten
            const tab = await browser.tabs.create({
                url: url,
                active: true
            });
            tabId = tab.id;
            console.log("Tab erstellt mit ID:", tabId);

            // 3. Warten, bis der Tab vollständig geladen ist
            await new Promise(resolve => {
                const listener = (updatedTabId, changeInfo) => {
                    if (updatedTabId === tabId && changeInfo.status === 'complete') {
                        browser.tabs.onUpdated.removeListener(listener);
                        resolve();
                    }
                };
                browser.tabs.onUpdated.addListener(listener);
            });

            console.log("Tab ist geladen. Starte saveAsPDF...");

            // 4. PDF Einstellungen
            const pdfSettings = {
                headerLeft: "",
                headerCenter: "",
                headerRight: "",
                footerLeft: "",
                footerCenter: "",
                footerRight: ""
            };

            // 5. API Aufruf
            // Wir warten auf den Status
            const status = await browser.tabs.saveAsPDF(pdfSettings);

            console.log("PDF Status:", status);

            if (status === 'saved') {
                console.log("Erfolg! PDF wurde gespeichert.");
            } else {
                console.warn("PDF wurde nicht gespeichert. Status:", status);
                // Wir lassen das Tab OFFEN, damit Sie sehen, was passiert ist!
                // Damit das Tab zur Diagnose offen bleibt, setzen wir tabId auf null.
                // Das verhindert, dass der finally-Block es schließt.
                tabId = null;
            }

            return { success: status === 'saved' };

        } catch (error) {
            console.error("KRITISCHER FEHLER im Background Script:", error);
            // Tab zur Diagnose offen lassen
            tabId = null;
            return { success: false, error: error.message };
        } finally {
            // 6. Aufräumen
            if (tabId) {
                await browser.tabs.remove(tabId);
            }
            if (url) {
                URL.revokeObjectURL(url);
            }
        }
    }
});
