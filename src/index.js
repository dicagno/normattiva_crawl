import puppeteer from 'puppeteer';
import crypto from 'crypto';
import { uploadContentToDropbox } from './storage.js';

const stopwords = [
    "a", "ad", "al", "allo", "ai", "agli", "all", "alla", "d", "da", "dal", "dallo", 
    "dei", "degli", "del", "della", "delle", "di", "e", "ed", "in", "il", "la", "le", 
    "li", "lo", "l", "o", "gli", "un", "uno", "una", "ma", "per", "che", "su", "se", 
    "ci", "sì", "non", "più", "né", "ne", "con", "tra", "fra", "mi", "ti", "si", 
    "vi", "ci", "quello", "quella", "questo", "questa", "i", "tu", "io", "noi", 
    "voi", "loro", "gli", "suo", "sua", "tuo", "tuoi", "mio", "mie", "questi", 
    "quelle", "queste", "quei", "degli", "dei", "dell", "delle", "uno", "una", 
    "essere", "avere", "fare", "volere", "potere", "dovere", "andare", "venire",
  ];

function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time);
    });
}

function getURIHash(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
}

function splitText(content) {
    return content
        .split(/\s/g)
        .map((word) => word.trim())
        .filter((word) => word.length > 0)
        .filter((word) => !stopwords.includes(word));
}

function splitSentences(text) {
    // Replace common abbreviations with placeholders to prevent incorrect splits
    const abbreviations = [
        "art\\.", "articolo", "dott\\.", "sig\\.", "sigg\\.", "prof\\.", "ecc\\.", "cfr\\.",
        "n\\.", "vol\\.", "cap\\.", "dr\\.", "on\\.", "avv\\.", "pag\\."
    ];

    // Protect abbreviations by replacing the dot with a unique placeholder
    abbreviations.forEach((abbr) => {
        const regex = new RegExp(`\\b${abbr}\\b`, "gi");
        text = text.replace(regex, (match) => match.replace(".", "[DOT]"));
    });

    // Regex to split sentences by periods, exclamation marks, or question marks
    // Ensure the split doesn't occur after the placeholders
    const sentences = text
        .split(/(?<=[.!?])\s+(?=[A-Z])/)
        .map((sentence) => sentence.trim());

    // Restore the placeholders back to their original forms
    const restoredSentences = sentences.map((sentence) =>
        abbreviations.reduce((updatedSentence, abbr) => {
            const placeholder = abbr.replace(".", "[DOT]");
            return updatedSentence.replace(new RegExp(`\\b${placeholder}\\b`, "g"), abbr);
        }, sentence)
    );

    return restoredSentences;
}


async function extractArticle(page, {
    link,
    uriHash,
    title,
    ISODate,
}) {
    await page.goto(`https://www.normattiva.it${link}`);
    await page.setViewport({ width: 1080, height: 1024 });

    const content = await page.$eval('div.DettaglioPag div#testo', el => el.innerText.trim());
    const chunks = splitText(content);
    const sentences = splitSentences(content);

    sentences.map((sentence) => {
        const words = splitText(sentence);
        return {
            words,
            sentence,
        };
    });

    return {
        metadata: {
            link,
            uriHash,
            title,
            ISODate,
        },
        sentences,
        content,
    };
}

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    let feed = [];

    await page.goto('https://www.normattiva.it/ricerca/avanzata');
    await page.setViewport({ width: 1080, height: 1024 });
    await page.locator('input#annoProvvedimento').fill('2020');
    await page.locator('button[type="submit"]').click();

    // Wait for the pagination element to be available
    let pageNumbersListEl = await page.locator('ul.pagination').waitHandle();

    // Evaluate the number of pages correctly
    const pageNumbers = await pageNumbersListEl.evaluate(el => {
        return Array.from(el.querySelectorAll('li')).map((li, index) => index + 1);
    });

    console.log('pageNumbers', pageNumbers);

    for (let i = 0; i < pageNumbers.length; i++) {
        console.log('clicking on pageNumber:', pageNumbers[i]);
        await page.locator(`ul.pagination li:nth-child(${i + 1})`).click();

        // Wait for the results to load after clicking
        await page.waitForSelector('div#elenco_risultati');

        const parentDiv = await page.$('div#elenco_risultati');
        if (!parentDiv) throw new Error('parentDiv not found');

        let childrenDivs = await parentDiv.$$('div.boxAtto');

        const result = await Promise.all(childrenDivs.map(async (el) => {
            const dateText = await el.$eval('.DateGU', el => el.innerText);
            const parts = dateText.match(/(\d{2}-\d{2}-\d{4})/igm)[0].split('-');
            const date = new Date(
                parseInt(parts[2], 10),
                parseInt(parts[1], 10) - 1,
                parseInt(parts[0], 10),
                1,
            );
            const dettaglioAttoElHandle = await el.$('a[title="Dettaglio atto"]');

            const link = await dettaglioAttoElHandle.evaluate(el => el.getAttribute('href'));
            const title = await dettaglioAttoElHandle.evaluate(el => el.innerText);
            const uriHash = getURIHash(link);
            const ISODate = date.toISOString();

            const article = {
                link,
                uriHash,
                title,
                ISODate,
            };

            console.log('article', article);
            return article;
        }));

        console.log('result', result);
        feed.push(...result);

        await delay(10);
    }

    feed = feed.sort((a, b) => new Date(a.ISODate) - new Date(b.ISODate));
    await uploadContentToDropbox(JSON.stringify(feed, null, 2), `/normattiva-crawl/feed-${new Date().toISOString().split('T')[0]}.json`);

    for (const article of feed) {
        const articleData = await extractArticle(page, article);
        const { metadata: { uriHash } } = articleData;

        await uploadContentToDropbox(JSON.stringify(articleData, null, 2), `/normattiva-crawl/article-${uriHash}.json`);
    }

    await browser.close();
})();