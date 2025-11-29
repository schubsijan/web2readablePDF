// @ts-check
export const overlayStyle = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: auto;
    background-color: #f0f0f0;
    border-bottom: 1px solid #ccc;
    z-index: 2147483647; /* Maximaler Z-Index */
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    font-family: Arial, sans-serif;
    padding: 10px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

export const containerStyle = `
    width: 90%;
    height: 100%;
    margin: auto;
`;

export const headerStyle = `
    width: 100%;
    display: flex;
    gap: 10px;
    align-items: center;
    position: sticky;
    top: 0;
    background-color: white;
    padding: 10px;
    z-index: 9999999999999999999999999999999999999999999;
`;

export const printCss = `
    @media print {
        /* 1. Ausblenden */
        #zotero-pdf-editor-overlay, header, footer, nav, aside, [role="banner"], [role="navigation"], [role="contentinfo"], .cookie-banner, #cookie-banner, .ad, .advertisement, [web2readablePDF-hide] {
            display: none !important;
        }

        /* 2. Farben */
        * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
        }

        /* 3. Shadow Host (Der Iframe-Container) */
        [web2readablePDF-iframe] {
            display: block !important;
            position: relative !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            background-color: white !important;
            
            /* KORREKTUR: Kein width: 100% hier! */
            max-width: 100% !important; 
            box-sizing: border-box !important;
            margin-bottom: 2em !important;
        }

        /* 4. Globaler Reset */
        @page {
            margin: 15mm;
            size: auto;
        }

        html, body {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background-color: white !important;
            min-height: 100%;
        }

        img, svg, canvas {
            max-width: 100% !important;
            height: auto !important;
            display: block;
            page-break-inside: avoid;
        }

        /* Text-Reset (NICHT für Iframe) */
        p, h1, h2, h3, h4, h5, h6, li, span, div:not([web2readablePDF-iframe]), article {
            overflow-wrap: break-word !important;
        }
    }

    body[web2readablePDF-overlay-visible] [web2readablePDF-hide] {
        display: none !important;
    }
`;
