const url = require('url');
const psl = require('psl');
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
    timeout: 60000,
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

    getBrowser() {
        return this.browser;
    }

    getPage() {
        return this.page;
    }

    async movePage(url) {
        const parser = this.parseURL(url);
        if (parser !== null && parser.hash === null) {
            const response = await this.page.goto(url, {waitUntil: 'networkidle2', timeout: 0});
            return response._status;
        } else {
            console.error(`this is inform url (URL: ${url})`);
            return 404;
        }
    }

    async wait(time) {
        await this.page.waitForTimeout(time);
    }

    parseURL(urlString) {
        try {
            return url.parse(urlString);
        } catch (err) {
            console.error(err);
            return null;
        }
    }

    async extractFirstCookies() {
        return await this.page.cookies();
    }

    async extreactAllCookies() {
        return (await this.page._client.send('Network.getAllCookies')).cookies;
    }

    async extractThirdCookies() {
        // const cookies = await this.page.cookies();
        const host = url.parse(this.page.url()).host;

        // // Extract first cookies domain
        // const domains = [];
        // for (const elem of cookies) {
        //     if (!domains.includes(elem.domain)) {
        //         domains.push(elem.domain);
        //     }
        // }
        // // Get all cookies
        // const allCookies = await this.extreactAllCookies();

        // // Filter
        // const thirdCookies = [];
        // for (const elem of allCookies) {
        //     if (!domains.includes(elem.domain)) {
        //         let publisher = elem.domain;
        //         if (elem.domain.replace(/^|S/)) {
        //             publisher = psl.get(elem.domain.substring(1));
        //         }

        //         thirdCookies.push({
        //             name: elem.name,
        //             conn: host,
        //             publisher: publisher,
        //             value: elem.value
        //         });
        //     }
        //     // Delete cookies in page
        //     await this.page.deleteCookie(elem);
        // }

        // Extract first cookies domain
        const tld = psl.get(host);
        // Get all cookies
        const allCookies = await this.extreactAllCookies();
        // Filter
        const thirdCookies = [];
        for (const elem of allCookies) {
            // Extract publisher (tld)
            let publisher;
            if (elem.domain.replace(/^[.]S+/)) {
                publisher = psl.get(elem.domain.substring(1));
            } else {
                publisher = psl.get(elem.domain);
            }
            // If not matched (third-party cookies)
            if (publisher !== tld) {
                thirdCookies.push({
                    name: elem.name,
                    conn: host,
                    publisher: publisher,
                    value: elem.value
                });
            }
            // Delete cookies in page
            await this.page.deleteCookie(elem);
        }
        return thirdCookies;
    }

    async close() {
        await this.browser.close();
    }
}

module.exports = Browser;