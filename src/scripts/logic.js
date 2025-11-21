// @ts-check
import { Readability } from '@mozilla/readability';

export const OVERLAY_ID = 'zotero-pdf-editor-overlay';

/**
 * Logik: Sendet Daten an Background Script (REIN LOGIK, KEINE UI)
 * @param {ArticleData} articleData 
 */
export async function savePdfLogic(articleData) {
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>${articleData.metadata.title}</title>
            <style>
                body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                img { max-width: 100%; height: auto; display: block; page-break-inside: avoid; break-inside: avoid; }
                figure { display: block; margin: 2em 0; page-break-inside: avoid; break-inside: avoid; }
                h1, h2, h3, h4, h5 { page-break-after: avoid; break-after: avoid; }
            </style>
        </head>
        <body>
            ${articleData.html}
        </body>
        </html>
    `;

    await browser.runtime.sendMessage({
        command: 'generate-pdf-native',
        html: htmlContent,
        title: articleData.metadata.title
    });
}

/**
 * Hilfsfunktion: Inhalt bereinigen (Unverändert zur Logik, nur Hilfs-DOM)
 * @param {string} htmlContent - HTML-String
 */
function adjustContent(htmlContent) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;

    const images = tempDiv.querySelectorAll('img');
    images.forEach(img => {
        if (img.src) img.src = img.src; // Absolute URLs
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.display = 'block';
    });

    return tempDiv.innerHTML;
}

/**
 * Extraktion via Readability
 * @returns {Promise<ArticleData>}
 */
export async function getReadableHtml() {
    const documentClone = /** @type {Document} */ (document.cloneNode(true));
    const overlayElement = documentClone.getElementById(OVERLAY_ID);
    if (overlayElement) overlayElement.remove();

    const article = new Readability(documentClone).parse();

    if (!article || !article.content) {
        return {
            metadata: { title: "Fehler" },
            html: "<h1>Artikel konnte nicht extrahiert werden.</h1>"
        };
    }

    const title = article.title || "Titel unbekannt";
    const author = article.byline ? `Von ${article.byline}` : "";
    const published = article.publishedTime ? ` | ${new Date(article.publishedTime).toLocaleDateString()}` : "";

    const headerHtml = `
        <div id="zotero-article-header" style="border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 20px;">
            <h1 style="margin: 0 0 5px 0;font-size: 30px;">${title}</h1>
            <p style="color: #555; margin: 0;font-size: 14px;">${author}${published}</p>
        </div>
    `;

    const adjustedBody = adjustContent(article.content);
    const fullHtml = headerHtml + adjustedBody;

    return {
        metadata: article,
        html: fullHtml
    };
}
