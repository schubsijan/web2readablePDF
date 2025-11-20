module.exports = {
    // Definiert die Umgebung (Browser, Node, Browser-Erweiterung)
    env: {
        browser: true,
        es2021: true,
        webextensions: true // Wichtig für 'browser.' APIs
    },
    extends: ['eslint:recommended'],
    parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module',
    },
    rules: {
        // Beispiel: Erzwingt die Verwendung von const/let statt var
        'no-var': 'error',
        // Beispiel: Erlaubt Browser-APIs wie 'console.log'
        'no-console': 'off',
    },
    globals: {
        // Definiert die globalen Variablen, die von Firefox bereitgestellt werden
        "browser": "readonly"
        // Später auch: "jsPDF": "writable" (für Ihren globalen Workaround)
    }
};
