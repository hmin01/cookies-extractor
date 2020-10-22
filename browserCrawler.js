const Browser = require('./browser');

/* Link format
{
    depth: <number>
    url: <string>
}
*/

/* Module */
class BrowserCrawler extends Browser {
    constructor() {
        super();

        this.links = [];
    }

    init (url) {
        const parser = this.parseURL(url);
        if (parser !== null) {
            this.links = [{
                depth: 0,
                url: {
                    href: parser.href,
                    hostname: parser.hostname,
                    pathname: parser.pathname,
                    query: parser.query
                }
            }];
        }
    }

    getLinks() {
        return this.links;
    }

    getLinkCount() {
        return this.links.length;
    }

    getLinkShift() {
        return this.links.shift();        
    }

    async querySelectorAll(selector) {
        return await this.page.$$(selector);
    }

    async extractProperty(handle, property) {
        const jsHandle = await handle.getProperty(property);
        return await jsHandle.jsonValue();
    }

    async extractLinks(depth) {
        const elementHandles = await this.querySelectorAll('a');
        for (const handle of elementHandles) {
            const link = await this.extractProperty(handle, 'href');
            const parser = this.parseURL(link);
            await this.saveLink(depth, parser);
        }

        return depth + 1;
    }

    async saveLink(depth, parser) {
        // Support http/https
        if (parser === null || (parser.protocol !== "https:" && parser.protocol !== "http:")) {
            return false;
        }
        // Exception .exe
        if ((parser.pathname.indexOf('.exe') > -1) || (parser.pathname.indexOf('.dmg') > -1)) {
            return false;
        }
        // duplicate check
        for (const elem of this.links) {
            if (elem.url.hostname === parser.hostname && elem.url.pathname === parser.pathname && elem.url.query === parser.query) {
                return false;
            }
        }
        // Save link
        this.links.push({
            depth: depth + 1,
            url: {
                href: parser.href,
                hostname: parser.hostname,
                pathname: parser.pathname,
                query: parser.query
            }
        });

        return true;
    }

    async clearLinks() {
        this.links = [];
    }

}

module.exports = BrowserCrawler;