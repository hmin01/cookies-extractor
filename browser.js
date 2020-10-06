const puppeteer = require('puppeteer');

// Set browser size
const browserSize = {
    width: 1400,
    height: 900
}
// Puppeteer options (browser options)
const browserOptions = {
    headless: true,
    devtools: true,
    defaultViewport: {
        width: browserSize.width,
        height: browserSize.height,
        deviceScaleFactor: 1
    },
    timeout: 30000,
    args: [`--window-size=${browserSize.width},${browserSize.height}`]
}

/* Module */
class Browser {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    async create() {
        this.browser = await puppeteer.launch(browserOptions);
        this.page = await this.browser.newPage();
    }

    async getBrowser() {
        return this.browser;
    }

    async getPage() {
        return this.page;
    }

    async movePage(url) {
        await this.page.goto(url, {waitUntil: 'networkidle2'});
    }

    async wait(time) {
        await this.page.waitForTimeout(time);
    }

    async extractFirstCookies() {
        return await this.page.cookies();
    }

    async extreactAllCookies() {
        return (await this.page._client.send('Network.getAllCookies')).cookies;
    }

    async extractThirdCookies() {
        const cookies = await this.page.cookies();
        // Extract first cookies domain
        const domains = [];
        for (const elem of cookies) {
            if (!domains.includes(elem.domain)) {
                domains.push(elem.domain);
            }
        }
        // Get all cookies
        const allCookies = (await this.page._client.send('Network.getAllCookies')).cookies;
        // Filter
        const thirdCookies = [];
        for (const elem of allCookies) {
            if (!domains.includes(elem.domain)) {
                thirdCookies.push(elem);
            }
        }
        return thirdCookies;
    }

    async close() {
        await this.browser.close();
    }
}

module.exports = Browser;