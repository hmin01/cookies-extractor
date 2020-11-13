const BrowserCrawler = require('../browserCrawler');
const neo4jSession = require('../neo4j-session');

// crawling.js로부터 크롤링된 URL 경로를 받음 (Main)
process.on('message', async (message) => {
    const browser = new BrowserCrawler();
    await browser.create();

    const response = await browser.movePage(message);
    if (response < 400) {
        // Verify existence top level domain in graph database (neo4j)
        let selectResult = await neo4jSession.findTopLevelDomain(message);
        if (selectResult.result) {
            // Save tld node in graph database (neo4j)
            if (!selectResult.existence) {
                await neo4jSession.insertTopLevelDomain(message);
            }
        } else {
            console.error(selectResult.message);
        }
        // Verify existence sub level domain in graph database (neo4j)
        selectResult = await neo4jSession.findSubLevelDomain(message);
        if (selectResult.result) {
            // Save tld node in graph database (neo4j)
            if (!selectResult.existence) {
                await neo4jSession.insertSubLevelDomain(message);
            }
        } else {
            console.error(selectResult.message);
        }
        // Create relation (top level domain - sub level domain)
        await neo4jSession.insertRelationTLDAndSLD(message);

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
            await neo4jSession.insertRelationSLDAndTP(message, cookies);
            // Create relation (third party cookies - publisher)
            await neo4jSession.insertRelationPubliser(cookies);
        }

        console.info(`@@ Extracted cookies (URL: ${message})`);
        neo4jSession.close();
        process.exit(0);
    } else {
        console.error(`[Processing Error] Response code: ${response} / URL: ${message}`);
        process.exit(1);
    }
});