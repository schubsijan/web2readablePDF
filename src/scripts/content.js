// @ts-check
import { showOverlay, hideOverlay, getOverlayState } from './ui.js';

const isTopFrame = window === window.top;

if (isTopFrame) {
    browser.runtime.onMessage.addListener((message) => {
        if (message.command === "toggle-editor") {
            if (getOverlayState()) {
                hideOverlay();
            } else {
                showOverlay(handleSaveRequest);
            }
        }
    });
}

/**
 * Ersetzt ein Iframe durch einen Shadow-DOM Container für den Druck.
 * * @param {HTMLIFrameElement} iframe - Das zu ersetzende Iframe-Element
 * @param {{ html: string, width?: number, height?: number }} data - Die Daten aus dem Iframe
 */
function replaceIframeWithShadow(iframe, data) {
    try {
        // --- 1. GRÖSSEN BERECHNEN ---
        const rect = iframe.getBoundingClientRect();
        // Original-Dimensionen (so wie das Chart berechnet wurde)
        const originalWidth = rect.width > 0 ? rect.width : (data.width || 600);
        const originalHeight = rect.height > 0 ? rect.height : (data.height || 400);

        // Höhen-Puffer für Legende
        const contentHeight = originalHeight + 50;

        // PDF-Limit (A4 sicher)
        const PDF_MAX_WIDTH = 680;

        // Skalierungsfaktor berechnen
        let scale = 1;
        if (originalWidth > PDF_MAX_WIDTH) {
            scale = PDF_MAX_WIDTH / originalWidth;
        }

        // Die "echte" Größe auf dem Papier (verkleinert)
        const hostWidth = originalWidth * scale;
        const hostHeight = contentHeight * scale;


        // --- 2. DER WRAPPER (Für Seitenumbruch-Schutz) ---
        const wrapper = document.createElement('div');
        wrapper.setAttribute('web2readablePDF-wrapper', '');

        // Grid-Trick + Transparenter Border (Der "Firefox-Kleber")
        wrapper.style.cssText = `
            display: grid !important; 
            grid-template-columns: 1fr !important;
            width: 100% !important;
            margin: 20px 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border: 1px solid transparent !important;
            position: relative !important;
        `;


        // --- 3. DER HOST (Die Box auf dem Papier) ---
        const host = document.createElement('div');
        host.setAttribute('web2readablePDF-iframe', "");

        // Styles kopieren
        const iframeStyle = window.getComputedStyle(iframe);
        if (iframeStyle.margin && iframeStyle.margin !== '0px') {
            wrapper.style.margin = iframeStyle.margin; // Margin auf Wrapper übertragen
        }

        // Wir geben dem Host exakt die verkleinerte (skalierte) Größe.
        // Das verhindert, dass er rechts aus der Seite ragt.
        host.style.setProperty('display', 'block', 'important');
        host.style.setProperty('width', hostWidth + 'px', 'important');
        host.style.setProperty('height', hostHeight + 'px', 'important');
        host.style.setProperty('position', 'relative', 'important');
        host.style.setProperty('overflow', 'hidden', 'important'); // Alles was übersteht abschneiden
        host.style.setProperty('margin', '0 auto', 'important'); // Zentrieren


        // --- 4. SHADOW DOM ---
        const shadow = host.attachShadow({ mode: 'open' });

        // Wir brauchen einen inneren Container für die Transformation
        const innerContainer = document.createElement('div');
        innerContainer.setAttribute('id', 'chart-container');
        innerContainer.innerHTML = data.html;
        shadow.appendChild(innerContainer);

        // --- 5. CSS INJEKTION ---
        const freezeStyle = document.createElement('style');
        freezeStyle.textContent = `
            /* Hier passiert die Magie:
               Der Container hat die ORIGINAL-Größe (damit die Balken stimmen),
               wird aber per Transform verkleinert, damit er in den Host passt.
            */
            #chart-container {
                width: ${originalWidth}px !important;
                height: ${contentHeight}px !important;
                transform: scale(${scale}) !important;
                transform-origin: top left !important; /* Wichtig: Oben links andocken */
                background-color: white !important;
                overflow: visible !important;
                display: block !important;
            }

            /* Standard Resets */
            body { margin: 0 !important; padding: 0 !important; width: 100% !important; height: 100% !important; overflow: visible !important; }

            /* Animation Killer & Chart Fixes */
            *, *::before, *::after { animation: none !important; transition: none !important; }
            path, line, polyline { stroke-dasharray: none !important; stroke-dashoffset: 0 !important; }
            * { clip-path: none !important; mask: none !important; -webkit-mask: none !important; }
            
            /* Sichtbarkeit erzwingen */
            svg { overflow: visible !important; opacity: 1 !important; visibility: visible !important; }
            path, polyline, line, circle { visibility: visible !important; opacity: 1 !important; stroke-opacity: 1 !important; fill-opacity: 1 !important; }

            /* Druckfarben */
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        `;

        shadow.prepend(freezeStyle);
        // Zur Sicherheit
        shadow.appendChild(freezeStyle.cloneNode(true));

        // --- ZUSAMMENBAUEN ---
        wrapper.appendChild(host);
        iframe.parentNode.replaceChild(wrapper, iframe);

        return true;
    } catch (e) {
        console.error("Fehler beim Ersetzen des Iframes:", e);
        return false;
    }
}

async function handleSaveRequest() {
    console.log("Start: Iframe-Verarbeitung...");

    // 1. Alle Iframes finden
    const iframes = Array.from(document.querySelectorAll('iframe'));

    if (iframes.length > 0) {
        // Wir erstellen ein Promise, das wartet, bis wir fertig sind
        await new Promise((resolve) => {
            let processedCount = 0;
            const totalIframes = iframes.length;

            // Timeout: Wenn nach 3 Sekunden nicht alle geantwortet haben, machen wir weiter
            const timeout = setTimeout(() => {
                console.warn(`Timeout: Nur ${processedCount}/${totalIframes} Iframes verarbeitet.`);
                resolve();
            }, 3000);

            // Listener für Antworten der Iframes
            /** * @param {MessageEvent} event 
             */
            const messageHandler = (event) => {
                if (event.data && event.data.type === 'WEB2PDF_FRAME_DATA') {
                    // Finde den passenden Iframe
                    const targetIframe = iframes.find(ifr => ifr.contentWindow === event.source);

                    if (targetIframe) {
                        replaceIframeWithShadow(targetIframe, event.data);
                        processedCount++;
                    }

                    // Wenn alle fertig sind: Aufräumen und weiter
                    if (processedCount >= totalIframes) {
                        clearTimeout(timeout);
                        window.removeEventListener('message', messageHandler);
                        resolve();
                    }
                }
            };

            window.addEventListener('message', messageHandler);

            // Trigger an alle Iframes senden
            iframes.forEach(ifr => {
                // Wir senden an alle, egal ob same- oder cross-origin
                ifr.contentWindow.postMessage({ type: 'WEB2PDF_REQUEST_DATA' }, '*');
            });
        });
    }

    console.log("Iframes verarbeitet. Generiere PDF...");

    // 2. Eigentlichen PDF-Druck anfordern (Nachricht an Background)
    const response = await browser.runtime.sendMessage({
        command: 'generate-pdf'
    });

    return response;
}


// --- Logik für Child-Frames (Iframes) ---
if (!isTopFrame) {
    // Wir hören auf die Anforderung vom Top-Frame
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'WEB2PDF_REQUEST_DATA') {
            try {
                // URL Fixing (Pfade absolut machen)
                document.querySelectorAll('img, script, link, a').forEach((/** @type {any} */ el) => {
                    if (el.src && el.hasAttribute('src')) el.setAttribute('src', el.src);
                    if (el.href && el.hasAttribute('href')) el.setAttribute('href', el.href);
                    if (el.hasAttribute('srcset')) el.removeAttribute('srcset');
                });

                // Daten senden
                const docContent = document.documentElement.outerHTML;
                const rect = document.body.getBoundingClientRect();
                const height = rect.height > 0 ? rect.height : document.body.scrollHeight;
                const width = rect.width > 0 ? rect.width : document.body.scrollWidth;

                // Antwort an Parent (Top Frame)
                window.parent.postMessage({
                    type: 'WEB2PDF_FRAME_DATA',
                    html: docContent,
                    width: width,
                    height: height
                }, '*');
            } catch (e) {
                console.error("Fehler im Iframe-Skript:", e);
            }
        }
    });
}
