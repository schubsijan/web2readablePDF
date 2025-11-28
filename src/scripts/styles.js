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
        #zotero-pdf-editor-overlay, header, footer, nav, aside, [role="banner"], [role="navigation"], [role="contentinfo"], .cookie-banner, #cookie-banner, .ad, .advertisement, [web2readablePDF-hide] {
            display: none !important;
        }
        
        img { max-width: 100%; height: auto; display: block; page-break-inside: avoid; break-inside: avoid; }
        figure { display: block; margin: 2em 0; page-break-inside: avoid; break-inside: avoid; }
        h1, h2, h3, h4, h5 { page-break-after: avoid; break-after: avoid; }
    }
    
    body[web2readablePDF-overlay-visible] [web2readablePDF-hide] {
        display: none !important;
    }

    /* Optional: Platzhalter, damit der fixierte Header im Browser nicht den Content verdeckt */
    body {
        margin-top: 60px !important; 
    }
    @media print {
        body {
            margin-top: 0 !important;
        }
    }
`;
