//anki-parser.js
// ==========================================
// ANKI DATABASE PARSING
// ==========================================

import { initSQL, getJSZip, getFzstd } from './lib-loader.js';

export async function extractDatabase(file) {
    const JSZip = getJSZip();
    const fzstd = getFzstd();

    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    let dbFile = contents.file('collection.anki21b');
    let needsDecompression = false;

    if (dbFile) {
        needsDecompression = true;
    } else {
        dbFile = contents.file('collection.anki21') || contents.file('collection.anki2');
    }

    if (!dbFile) throw new Error('No Anki database found in .colpkg file');
    let dbData = await dbFile.async('uint8array');
    if (needsDecompression) dbData = fzstd.decompress(dbData);
    return dbData;
}

export async function parseAnkiDatabase(dbArray) {
    const SQL = await initSQL();
    const db = new SQL.Database(dbArray);

    const reviewQuery = `SELECT cid as card_id, ease, ivl as interval, id as time FROM revlog ORDER BY id DESC`;
    const reviewResult = db.exec(reviewQuery);
    const reviewHistory = new Map();

    if (reviewResult.length) {
        reviewResult[0].values.forEach(([cardId, ease, interval, time]) => {
            if (!reviewHistory.has(cardId)) reviewHistory.set(cardId, []);
            reviewHistory.get(cardId).push({ ease, interval, time });
        });
    }

    const query = `
        SELECT 
            cards.id as card_id, cards.nid as note_id, cards.did as deck_id,
            cards.reps as reviews, cards.lapses as lapses,
            notes.flds as fields, notes.mid as model_id
        FROM cards
        LEFT JOIN notes ON cards.nid = notes.id
        WHERE cards.queue >= 0
        AND cards.reps > 0
        AND cards.did = (SELECT MIN(did) FROM cards WHERE queue >= 0)
    `;

    const result = db.exec(query);
    if (!result.length) throw new Error('No cards found in database');

    const cards = result[0].values.map(row => {
        const [cardId, noteId, deckId, reviews, lapses, fields, modelId] = row;
        const fieldArray = fields ? fields.split('\x1f') : [];
        return {
            id: fieldArray[3] || String(cardId),
            cardId: cardId,
            deckId,
            reps: reviews || 0,
            lapses: lapses || 0,
            fields: fieldArray,
            sentence: fieldArray[1] || '',
            translation: fieldArray[2] || '',
            plainText: fieldArray[0] || '',
            reviewHistory: reviewHistory.get(cardId) || []
        };
    });

    db.close();
    return { cards, decks: {} };
}

export async function loadCollection(file) {
    const dbArray = await extractDatabase(file);
    const { cards, decks } = await parseAnkiDatabase(dbArray);
    return { cards, decks };
}