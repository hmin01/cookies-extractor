const url = require('url');
const psl = require('psl');
const neo4j = require('neo4j-driver');
const driver = neo4j.driver('neo4j://localhost', neo4j.auth.basic("neo4j", "qlalfqjsgh"));
// Option
const DATABASE = "neo4j";

module.exports = {
    insertTopLevelDomain: async function(urlString, type=true) {
        try {
            // Create query
            const query = "CREATE (tld1: TopLevelDomain {tld: $tld})";
            // Create params
            const params = {
                tld: type ? psl.get(url.parse(urlString).host) : urlString
            };
            // Query and return
            return await insert(driver, query, params);
        } catch (err) {
            return {result: false, message: err.message};
        }
    },

    insertSubLevelDomain: async function(urlString) {
        try {
            // Create query
            const query = "CREATE (sld1: SubLevelDomain {domain: $domain, parent: $tld})";
            // Create params
            const params = {
                domain: url.parse(urlString).host,
                tld: psl.get(url.parse(urlString).host)
            };
            // Query and return
            return await insert(driver, query, params);
        } catch (err) {
            return {result: false, message: err.message};
        }
    },

    insertThirdParty: async function(params) {
        try {
            // Create query
            const query = "CREATE (tp1: ThridPartyCookies {name: $name, conn: $conn, publisher: $publisher, value: $value})";
            // Query and return
            return await insert(driver, query, params);
        } catch (err) {
            return {result: false, message: err.message};
        }
    },

    insertRelationTLDAndSLD: async function(urlString) {
        try {
            // Create select query
            const selectQuery = "MATCH (tp1 {domain: $domain, parent: $tld})-[r]->(tld1) RETURN (r)";
            // Create params
            let params = {
                domain: url.parse(urlString).host,
                tld: psl.get(url.parse(urlString).host)
            };
            // Query
            const result = await select(driver, selectQuery, params);
            // Verify existence
            if (result.result && result.message.records.length === 0) {
                // Create query
                const query = "Match (tld1 {tld: $tld}), (sld1 {domain: $domain, parent: $tld}) CREATE (sld1) - [r1: RootDomain]->(tld1)";
                // Query and return
                return await insert(driver, query, params);
            } else {
                onsole.log();
                return {result: true};
            }
        } catch (err) {
            return {result: false, message: err.message};
        }
    },

    insertRelationSLDAndTP: async function(urlString, data) {
        try {
            // Create select query
            const selectQuery = "match (tp1 {name: $name, conn: $conn, publisher: $publisher})-[r]->(sld1) return (r)";
            // Create params
            const params = {
                name: data.name,
                conn: data.conn,
                publisher: data.publisher
            }
            // Query
            const result = await select(driver, selectQuery, params);
            // Verify existence
            if (result.result && result.message.records.length === 0) {
                // Create insert query
                const insertQuery = "Match (sld1 {domain: $conn, parent: $parent}), (tp1 {name: $name, conn: $conn, publisher: $publisher}) CREATE (tp1) - [r2: Contain]->(sld1)";
                // Add param property
                params.parent = psl.get(url.parse(urlString).host);
                // Query and return
                return await insert(driver, insertQuery, params);
            } else {
                return {result: true};
            }
        } catch (err) {
            return {result: false, message: err.message};
        }
    },

    insertRelationPubliser: async function(data) {
        try {
            // Create select query
            const selectQuery = "MATCH (tp1 {name: $name, conn: $conn, publisher: $publisher}), (tld1 {tld: $publisher})-[r]->(tp1) RETURN (r)";
            // Create params
            const params = {
                name: data.name,
                conn: data.conn,
                publisher: data.publisher
            }
            // Query
            const result = await select(driver, selectQuery, params);
            // Verify existence
            if (result.result) {
                if (result.message.records.length === 0) {
                    // Verify existence
                    const selectResult = await this.findTopLevelDomain(params.publisher, false);
                    if (!selectResult.result) {
                        await this.insertTopLevelDomain(params.publisher, false);
                    }
                    // Create insert query
                    insertQuery = "Match (tld1 {tld: $publisher}), (tp1 {name: $name, conn: $conn, publisher: $publisher}) CREATE (tld1) - [r3: Publish]->(tp1)";
                    // Query and return
                    return await insert(driver, insertQuery, params);
                } else {
                    return {result: true};
                }
            } else {
                return result;
            }
        } catch (err) {
            return {result: false, message: err.message};
        }
    },

    findTopLevelDomain: async function(urlString, type=true) {
        try {
            // Create query
            const query = "MATCH (tld1 {tld: $tld}) return (tld1)";
            // Create params
            const params = {
                tld: type ? psl.get(url.parse(urlString).host) : urlString
            };
            // Query and return
            const result = await select(driver, query, params);
            if (result.result) {
                if (result.message.records.length > 0) {
                    return {result: true, existence: true, message: result.message.records};
                } else {
                    return {result: true, existence: false, message: "Not found TLD"};
                }
            } else {
                return result;
            }
        } catch (err) {
            return {result: false, message: err.message};
        }
    },

    findSubLevelDomain: async function(urlString) {
        try {
            // Create query
            const query = "MATCH (sld1 {domain: $domain, parent: $tld}) return (sld1)";
            // Create params
            const params = {
                domain: url.parse(urlString).host,
                tld: psl.get(url.parse(urlString).host)
            };
            // Query and return
            const result = await select(driver, query, params);
            if (result.result) {
                if (result.message.records.length > 0) {
                    return {result: true, existence: true, message: result.message.records};
                } else {
                    return {result: true, existence: false, message: "Not found SLD"};
                }
            } else {
                return result;
            }
        } catch (err) {
            return {result: false, message: err.message};
        }
    },

    findThridParty: async function(data) {
        try {
            // Create query
            const query = "MATCH (tp1 {name: $name, conn: $conn, publisher: $publisher}) return (tp1)";
            // Create params
            const params = {
                name: data.name,
                conn: data.conn,
                publisher: data.publisher
            };
            // Query and return
            const result = await select(driver, query, params);
            if (result.result) {
                if (result.message.records.length > 0) {
                    return {result: true, existence: true, message: result.message.records};
                } else {
                    return {result: true, existence: false, message: "Not found third-party cookies"};
                }
            } else {
                return result;
            }
        } catch (err) {
            return {result: false, message: err.message};
        }
    },

    close: async function() {
        try {
            await driver.close();
        } catch (err) {
            return 
        }
    }
}

/* Create session */
function createSession(driver, mode) {
    // Create options
    let options = {
        database: DATABASE
    };
    // Access mode
    if (mode === "read") {
        options.defaultAccessMode = neo4j.session.READ;
    } else if (mode === "write") {
        options.defaultAccessMode = neo4j.session.WRITE;
    }
    
    return driver.session(options);
}

async function insert(driver, query, params) {
    try {
        // Create session
        const session = createSession(driver, "write");
        // Query (using transaction)
        const result = await session.writeTransaction(async tx => {
            const result = await tx.run(query, params);
            return result;
        });
        // Close session
        await session.close();
        // Reutrn
        return {result: true, message: result};
    } catch (err) {
        return {result: false, message: err.message};
    }
}

async function select(driver, query, params) {
    try {
        // Create session
        const session = createSession(driver, "read");
        // Query (using transaction)
        const result = await session.readTransaction(async tx => {
            const result = await tx.run(query, params);
            return result;
        });
        // Close session
        await session.close();
        // Reutrn
        return {result: true, message: result};
    } catch (err) {
        return {result: false, message: err.message};
    }
}