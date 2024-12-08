import puppeteer from 'puppeteer'; // Use the native puppeteer package
import { uploadContentToDropbox } from './storage.js'; // Import the Dropbox upload function
import crypto from 'crypto'; // Import the crypto module

function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time);
    });
}

function getURIHash(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
}

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    let feed = [];

    await page.goto('https://www.normattiva.it/ricerca/avanzata');
    await page.setViewport({ width: 1080, height: 1024 });
    await page.locator('input#annoProvvedimento').fill('2024');
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

    await browser.close();
})();