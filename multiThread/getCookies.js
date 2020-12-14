const fs = require('fs');
const path = require('path');
const neo4jSession = require('../neo4j-session');

(async function() {
    const tld = "ppomppu.co.kr";
    const result = await neo4jSession.findThridPartyByTLD(tld);
    // if (result.result) {

    // } else {
    //     console.error(result.message);
    // }

    neo4jSession.close();
})();