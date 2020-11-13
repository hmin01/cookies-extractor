const BrowserCrawler = require('./browserCrawler');
const neo4jSession = require('./neo4j-session');
// CONSTANT
const DEPTH = 1;

(async function main() {
    try {
        const browser = new BrowserCrawler();
        await browser.create();

        let depth = 0;
        let index = 0;
        // Init
        browser.init("https://www.naver.com/");
        // Process
        console.info("[Step 1] Extract links (LOOP)\n");
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

                console.info(`[step 1.3] finish extraction (index: ${index++} / link count: ${browser.getLinkCount()})`);
            } else {
                console.error(`Response code: ${response} / URL: ${link.url.href}`);
            }
        }
        console.info(`[Step 2] Finish get links (count: ${browser.getLinkCount()})\n`);

        // Get cookie
        // Extract cookies and save data in file
        const total = browser.getLinkCount();
        console.info("[Step 3] get cookies\n");
        for (let i=0; i<total; i++) {
            const link = browser.getLinkShift();
            browser.urlList[`${link.hostname}${link.pathname}`] = undefined;
            
            // console.info("\n[Processing] move website (URL: " + link.url.href + ")");
            const response = await browser.movePage(link.url.href);
            if (response < 400) {
                // Verify existence top level domain in graph database (neo4j)
                let selectResult = await neo4jSession.findTopLevelDomain(link.url.href);
                if (selectResult.result) {
                    // Save tld node in graph database (neo4j)
                    if (!selectResult.existence) {
                        await neo4jSession.insertTopLevelDomain(link.url.href);
                    }
                } else {
                    console.error(selectResult.message);
                }
                // Verify existence sub level domain in graph database (neo4j)
                selectResult = await neo4jSession.findSubLevelDomain(link.url.href);
                if (selectResult.result) {
                    // Save tld node in graph database (neo4j)
                    if (!selectResult.existence) {
                        await neo4jSession.insertSubLevelDomain(link.url.href);
                    }
                } else {
                    console.error(selectResult.message);
                }
                // Create relation (top level domain - sub level domain)
                await neo4jSession.insertRelationTLDAndSLD(link.url.href);

                // Extract cookies
                // console.info("[Processing] get cookies (first party and third party)");
                // const firstCookies = await browser.extractFirstCookies();
                const thirdCookies = await browser.extractThirdCookies();

                // Verify existence third-party cookies in graph database (neo4j)
                // console.info("[Processing] save data in graph database");
                for (const cookies of thirdCookies) {
                    selectResult = await neo4jSession.findThridParty(cookies);
                    if (selectResult.result) {
                        // Save tld node in graph database (neo4j)
                        if (!selectResult.existence) {
                            await neo4jSession.insertThirdParty(cookies);
                        }
                    } else {
                        console.error(selectResult.message);
                    }

                    // Create relation (sub level domain - third party)
                    await neo4jSession.insertRelationSLDAndTP(link.url.href, cookies);
                    // Create relation (third party cookies - publisher)
                    await neo4jSession.insertRelationPubliser(cookies);
                }
            } else {
                console.error(`[Processing Error] Response code: ${response} / URL: ${link.url.href}`);
            }

            console.info(`\n[Processing] move website (URL: ${link.url.href}) / [Progress: ${((i + 1) / total).toFixed(4) * 100}%]`);
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