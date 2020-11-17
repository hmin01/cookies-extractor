const path = require('path');
const childProcess = require('child_process');
const BrowserCrawling = require('../browserCrawler');

const DEPTH = 1;
let total = 0;

// Processing
(async function run() {
    try {
        const browser = new BrowserCrawling();
        await browser.create();

        let depth = 0, index = 0;
        // 초기화 (root url 설정)
        browser.init("https://www.naver.com/");
        // 웹 사이트에 존재하는 link 추출 (loop)
        console.info(`[Start] Extract links (Loop)\n`);
        while(browser.getLinkCount() !== 0) {
            if (total < browser.getLinkCount()) {
                total = browser.getLinkCount();
            }

            const link = browser.getLinkShift();
            // 지정한 Depth를 넘어갈 경우, 중단
            if ((link.depth - 1) > DEPTH) break;
            // URL로 이동
            try {
                console.info(`Move page (URL: ${link.url.href})`);
                const response = await browser.movePage(link.url.href);
                if (response < 400) {
                    // 페이지를 완전히 불러올 때까지 대기 (100ms)
                    await browser.wait(300);
                    await browser.page.mouse.click(0, 0, {button: "left"});
                    // 3rd-cookies 추출을 위해 child processs 생성
                    const childProc = childProcess.fork(path.join(__dirname, "extract.js"));
                    childProc.send(link.url.href);
                    // 해당 페이지 내에 있는 link 추출
                    if (link.depth <= DEPTH) {
                        depth = await browser.extractLinks(link.depth);
                        console.info(`@@ Extracted links (URL: ${link.url.href})`);
                    }
                } else {
                    console.error(`Response code: ${response} / URL: ${link.url.href}`);
                }
            } catch (err) {
                console.error(err);
            }
        }

        console.info(`## Finish get links (count: ${total})\n`);
        browser.close();
    } catch (err) {
        console.error(err);
    }
})();