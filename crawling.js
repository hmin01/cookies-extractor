const BrowserCrawler = require('./browserCrawler');
const DEPTH = 1;

(async function main() {
    try {
        const browser = new BrowserCrawler();
        await browser.create();

        let depth = 0;
        let index = 0;
        // Init
        browser.init("https://www.naver.com");
        // Process
        while(browser.getLinkCount() !== 0) {
            const link = browser.getLinkShift();
            // Break
            if (link.depth > DEPTH) break;

            // Move page
            console.info(`[step 1.1] move page (URL: ${link.url.href})`);
            const response = await browser.movePage(link.url.href);
            if (response < 400) {
                depth = await browser.extractLinks(link.depth);
                console.info(`Cnt: ${index++}`);
            } else {
                console.error(`Response code: ${response} / URL: ${link.url.href}`);
            }
        }
        // Console
        console.log("[step 2] Finish get links (count: " + browser.getLinkCount() + ")");

        // Finish
        console.info("[step 4] finish");
        await neo4jSession.close();
        await browser.close();
        delete browser;
    } catch (err) {
        console.error(err);
    }
})();