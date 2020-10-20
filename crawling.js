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
        while(browser.getLinkCount() !== 0) {
            const link = browser.getLinkShift();
            // Break
            if (link.depth > DEPTH) break;
            // Process
            const response = await browser.movePage(link.url.href);
            if (response < 400) {
                await browser.wait(100);
                depth = await browser.extractLinks(link.depth);

                console.log(`Cnt: ${index++}`);
            } else {
                console.error(`Response code: ${response._status} / URL: ${link.url.href}`);
            }
        }
        // Console
        console.log("--- FINISH ---");
        console.log(browser.getLinkCount());
        // Finish
        await browser.close();
        delete browser;
    } catch (err) {
        console.error(err);
    }
})();