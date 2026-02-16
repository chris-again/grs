//lib-loader.js
// ==========================================
// EXTERNAL LIBRARY WRAPPERS
// ==========================================

export async function initSQL() {
    if (typeof initSqlJs === 'undefined') {
        throw new Error('SQL.js not loaded');
    }
    return await initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${file}`
    });
}

export function getJSZip() {
    if (typeof JSZip === 'undefined') {
        throw new Error('JSZip not loaded');
    }
    return JSZip;
}

export function getFzstd() {
    if (typeof fzstd === 'undefined') {
        throw new Error('fzstd not loaded');
    }
    return fzstd;
}