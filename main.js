const Browser = require('./browser');
const neo4jSession = require('./neo4j-session');
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
        const sources = JSON.parse(fs.readFileSync(path.join(__dirname, "source.json")).toString());
        if (sources.length === 0) {
            console.info("No source URL");
            return;
        }
        // Create browser and page (using puppeteer)
        console.info("[step 2] create browser");
        const browser = new Browser();
        await browser.create();
        // Extract cookies and save data in file
        console.info("[step 3] get cookies");

        let index = 0;
        for (const url of sources) {
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

            console.info("[processing] save data in file");
            // await createFile(url, "first", firstCookies);
            await createFile(url, "third", thirdCookies);
        }
        // Close browser
        console.info("[step 4] finish");
        await neo4jSession.close();
        await browser.close();
        delete browser;
    } catch (err) {
        console.error(err);
    }
})();