const Browser = require('./browser');
const fs = require('fs');
const path = require('path');
const url = require('url');

/* Create file */
async function createFile(urlString, type="first", data=[]) {
    const hostName = (url.parse(urlString)).hostname;
    const filename = `${Date.now()}_${hostName}_${type}.json`;
    const resultPath = path.join(__dirname, "results");
    if (!fs.existsSync(resultPath)) {
        fs.mkdirSync(resultPath);
    }
    fs.writeFileSync(path.join(resultPath, filename), JSON.stringify(data));
}

/* Run */
(async function main() {
    try {
        // Get source (read url list)
        console.info("[step 1] get sources");
        const sources = JSON.parse(fs.readFileSync(path.join(__dirname, "source.txt")).toString());
        if (sources.length === 0) {
            console.log("No source URL");
            return;
        }
        // Create browser and page (using puppeteer)
        console.info("[step 2] create browser");
        const browser = new Browser();
        await browser.create();
        // Extract cookies and save data in file
        console.info("[step 3] get cookies");
        for (const url of sources) {
            console.info("[processing] move website");
            await browser.movePage(url);

            console.info("[processing] get cookies (first party and third party)");
            const firstCookies = await browser.extractFirstCookies();
            const thirdCookies = await browser.extractThirdCookies();

            console.info("[processing] save data in file");
            await createFile(url, "first", firstCookies);
            await createFile(url, "third", thirdCookies);
        }
        // Close browser
        console.info("[step 4] finish");
        await browser.close();
        delete browser;
    } catch (err) {
        console.error(err.message);
    }
})();