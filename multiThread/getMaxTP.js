const fs = require('fs');
const path = require('path');
const neo4jSession = require('../neo4j-session');

(async function() {
    const result = await neo4jSession.findThridPartyCountByTLD();
    await neo4jSession.close();
    
    if (result.result) {
        const resultData = result.message;
        resultData.sort(function(a, b) {
            return a.tpCount > b.tpCount ? -1: a.tpCount < b.tpCount ? 1 : 0;
        });

        let convertString = "";
        for (const elem of resultData) {
            convertString += `${JSON.stringify(elem)}\r\n`;
        }

        const filePath = path.join(__dirname, 'domainList.txt');
        fs.writeFileSync(filePath, convertString);
    } else {
        console.error(result.message);
    }
})();