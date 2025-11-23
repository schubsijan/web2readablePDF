// @ts-check
export const overlayStyle = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: white;
    z-index: 99999;
    overflow-y: scroll;
    padding-bottom: 20px;
    box-sizing: border-box;
    font-family: Arial, sans-serif;
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
    margin-bottom: 10px;
    align-items: center;
    position: sticky;
    top: 0;
    background-color: white;
    padding: 10px;
    z-index: 9999999999999999999999999999999999999999999;
`;

export const contentCss = `
    /* Nur anwenden, wenn der Container die Klasse "clean-mode" hat */
    
    .clean-mode {
        font-family: Helvetica, Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        overflow-wrap: break-word;
    }

    /* Brute Force Reset für ALLE Elemente innerhalb von clean-mode */
    .clean-mode * {
        max-width: 100% !important;
        box-sizing: border-box !important;
        position: static !important; /* Fixiert Elemente im Fluss */
        float: none !important;
        z-index: auto !important; /* Verhindert, dass Elemente über den Header ragen */
    }

    /* Bilder und Medien zähmen */
    .clean-mode img,
    .clean-mode video,
    .clean-mode iframe,
    .clean-mode svg {
        max-width: 100% !important;
        height: auto !important;
        display: block !important;
    }

    /* Tabellen scrollbar machen */
    .clean-mode table {
        display: block !important;
        width: 100% !important;
        overflow-x: auto !important;
    }

    /* Layout-Divs neutralisieren */
    .clean-mode div, 
    .clean-mode section, 
    .clean-mode article {
        width: auto !important;
        height: auto !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
        padding-right: 0 !important;
        padding-left: 0 !important;
        transform: none !important; /* Verhindert komplexe Layering-Probleme */
    }
`;
