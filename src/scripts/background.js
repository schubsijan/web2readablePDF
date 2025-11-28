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

browser.runtime.onMessage.addListener(async (message) => {
    if (message.command === 'generate-pdf') {

        try {
            const pdfSettings = {
                headerLeft: "",
                headerCenter: "",
                headerRight: "",
                footerLeft: "",
                footerCenter: "",
                footerRight: ""
            };
            // Speichert direkt den Tab, aus dem die Nachricht kam
            const status = await browser.tabs.saveAsPDF(pdfSettings);
            console.log("PDF Status:", status);
            return { success: status === 'saved' };
        } catch (error) {
            console.error("Fehler beim Speichern:", error);
            return { success: false, error: error.message };
        }
    }
});
