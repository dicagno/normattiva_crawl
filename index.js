import puppeteer from 'puppeteer';

function delay(time) {
    return new Promise(function(resolve) {
        setTimeout(resolve, time);
    });
}

const browser = await puppeteer.launch({headless: true});
const page = await browser.newPage();

await page.goto('https://www.normattiva.it/ricerca/avanzata');
await page.setViewport({width: 1080, height: 1024});
await page.locator('input#annoProvvedimento').fill('2024');
await page.locator('button[type="submit"]').click();

let pageNumbersListEl = await page
    .locator('ul.pagination')
    .waitHandle();

const pageNumbers = Object.keys(await pageNumbersListEl
    ?.evaluate(el => el.querySelectorAll('li')));

console.log('pageNumbers', pageNumbers);

for (let i = 0; i < pageNumbers.length; i++) {
    console.log('clicking on pageNumber:', pageNumbers[i]);
    await page
        ?.locator(`ul.pagination li:nth-child(${i + 1})`)
        .click();
    const elencoRisultatiLocator = await page
        ?.locator('div#elenco_risultati')
        const elencoRisultatiHandle = await elencoRisultatiLocator.waitHandle();

    const result = await elencoRisultatiHandle.evaluate(function (div, className) {
        return [...div.querySelectorAll('div.boxAtto')].map((el) => {
            const dateText = el.querySelector('.DateGU').innerText;
            const parts = dateText.match(/(\d{2}-\d{2}-\d{4})/igm)[0].split('-');
            const date = new Date(
                parseInt(parts[2], 10),
                parseInt(parts[1], 10) - 1,
                parseInt(parts[0], 10),
                    1,
            );
            const dettaglioAttoEl = el.querySelector('a[title="Dettaglio atto"]');
            return {
                link: dettaglioAttoEl.getAttribute('href'),
                title: dettaglioAttoEl.innerText,
                date: date.toISOString(),
            };
        });
    });

    console.log('result', result);


    await delay(1000)
}

await browser.close();
