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
        console.log("[step 1] Extract links (LOOP)");
        while(browser.getLinkCount() !== 0) {
            const link = browser.getLinkShift();
            // Break
            if (link.depth > DEPTH) break;

            // Move page
            console.info(`\r\n[step 1.1] move page (URL: ${link.url.href})`);
            const response = await browser.movePage(link.url.href);
            if (response < 400) {
                await browser.wait(100);
                console.info(`[step 1.2] extract link`);
                depth = await browser.extractLinks(link.depth);

                console.info(`[step 1.3] finish extraction (cnt: ${index++})`);
            } else {
                console.error(`Response code: ${response} / URL: ${link.url.href}`);
            }
        }
        // Console
        console.log("[step 2] Finish get links (count: " + browser.getLinkCount() + ")");

        // Get cookie
        // Extract cookies and save data in file
        console.info("[step 3] get cookies");
        for (const url of browser.getLinks()) {
            console.info("[processing] move website (URL: " + url + ")");
            await browser.movePage(url);
            // Verify existence top level domain in graph database (neo4j)
            let selectResult = await neo4jSession.findTopLevelDomain(url);
            if (!selectResult.result) {
                // Save tld node in graph database (neo4j)
                await neo4jSession.insertTopLevelDomain(url);
            }
            // Verify existence sub level domain in graph database (neo4j)
            selectResult = await neo4jSession.findSubLevelDomain(url);
            if (!selectResult.result) {
                // Save tld node in graph database (neo4j)
                await neo4jSession.insertSubLevelDomain(url);
            }
            // Create relation (top level domain - sub level domain)
            await neo4jSession.insertRelationTLDAndSLD(url);

            // Extract cookies
            console.info("[processing] get cookies (first party and third party)");
            // const firstCookies = await browser.extractFirstCookies();
            const thirdCookies = await browser.extractThirdCookies();

            // Verify existence third-party cookies in graph database (neo4j)
            console.info("[processing] save data in graph database");
            for (const cookies of thirdCookies) {
                selectResult = await neo4jSession.findThridParty(cookies);
                if (!selectResult.result) {
                    // Save tld node in graph database (neo4j)
                    await neo4jSession.insertThirdParty(cookies);
                }

                // Create relation (sub level domain - third party)
                await neo4jSession.insertRelationSLDAndTP(url, cookies);
                // Create relation (third party cookies - publisher)
                await neo4jSession.insertRelationPubliser(cookies);
            }

            // console.info("[processing] save data in file");
            // await createFile(url, "first", firstCookies);
            // await createFile(url, "third", thirdCookies);
        }

        // Finish
        console.info("[step 4] finish");
        await neo4jSession.close();
        await browser.close();
        delete browser;
    } catch (err) {
        console.error(err);
    }
})();