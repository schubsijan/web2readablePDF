// @ts-check
// Event-Listener für den Klick auf das Addon-Icon
browser.action.onClicked.addListener((tab) => {
    browser.tabs.sendMessage(tab.id, {
        command: "toggle-editor"
    }).catch(error => {
        // Falls die Seite noch kein Content-Skript hat (was bei Manifest V3 vorkommen kann)
        console.error("Fehler beim Senden der Nachricht:", error);
    });
});

browser.runtime.onMessage.addListener(async (message, sender) => {
    if (message.command === 'collect-all-frames') {
        const tabId = sender.tab.id;

        // WICHTIG: Wir geben das Promise DIREKT zurück.
        // Firefox wartet auf die Auflösung und sendet das Objekt zurück an das Content Script.
        return collectFrames(tabId);
    }

    if (message.command === 'generate-pdf-native') {

        let tabId = null;
        let url = null;

        try {
            console.log("Start: Erzeuge PDF...");

            const htmlBlob = new Blob([message.html], { type: 'text/html' });
            url = URL.createObjectURL(htmlBlob);

            const tab = await browser.tabs.create({
                url: url,
                active: true
            });
            tabId = tab.id;
            console.log("Tab erstellt mit ID:", tabId);

            // 3. Warten, bis der Tab vollständig geladen ist
            await new Promise(resolve => {
                /**
                    * @param {number} updatedTabId - Die ID des aktualisierten Tabs
                    * @param {browser.tabs._OnUpdatedChangeInfo} changeInfo - Enthält status, url, etc.
                */
                const listener = (updatedTabId, changeInfo) => {
                    if (updatedTabId === tabId && changeInfo.status === 'complete') {
                        browser.tabs.onUpdated.removeListener(listener);
                        resolve();
                    }
                };
                browser.tabs.onUpdated.addListener(listener);
            });

            console.log("Tab ist geladen. Starte saveAsPDF...");

            const pdfSettings = {
                headerLeft: "",
                headerCenter: "",
                headerRight: "",
                footerLeft: "",
                footerCenter: "",
                footerRight: ""
            };

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

/**
 * @param {number} tabId 
 * */
async function collectFrames(tabId) {
    try {
        // 1. Hole alle Frame-Infos des aktuellen Tabs
        const frames = await browser.webNavigation.getAllFrames({ tabId });

        const frameContents = [];

        // 2. Frage jeden Frame (außer Frame 0 = Top) nach seinem Inhalt
        const promises = frames.map(async (frame) => {
            if (frame.frameId === 0) return; // Top Frame überspringen

            try {
                // Sende Nachricht an spezifischen Frame
                const response = await browser.tabs.sendMessage(
                    tabId,
                    { command: "get-frame-content" },
                    { frameId: frame.frameId }
                );

                if (response && response.url && response.content) {
                    frameContents.push({
                        url: response.url,
                        content: response.content
                    });
                }
            } catch (err) {
                // Manche Frames (z.B. cross-origin protected) antworten evtl. nicht oder timeouten
                // Das ignorieren wir, damit der Rest weiterläuft.
                // console.warn(`Frame ${frame.frameId} antwortet nicht:`, err);
            }
        });

        await Promise.all(promises);

        // 3. Gib das Array zurück
        return { success: true, frames: frameContents };

    } catch (e) {
        console.error("Fehler beim Sammeln der Frames:", e);
        return { success: false, frames: [] };
    }
}
