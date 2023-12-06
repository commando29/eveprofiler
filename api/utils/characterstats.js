const path = require('path')
const fetch = require('cross-fetch');
require('dotenv').config({ path: path.resolve(__dirname, '../config.env'), dotenv_config_debug:true });
const { Character } = require("../model/character.js");
const { Corporation } = require("../model/corporation.js");
const dbo = require('../db/conn');

// config object
class CharacterStats {
    constructor() {

        this.zkillHeaders = {
            'Accept-Encoding': 'gzip',
            'User-Agent': 'CalebStatsScript',
            'Maintainer': 'Caleb bcartwright29@gmail.com'
        };

        this.esiHeaders = {
            'Accept-Encoding': 'gzip',
            'User-Agent': 'CalebStatsScript',
            'Maintainer': 'Caleb bcartwright29@gmail.com'
        };

    }

    MARAUDER_IDS = process.env.MARAUDER_IDS ? process.env.MARAUDER_IDS.split(",") : [];
    HISTORY_DAYS_TO_PROCESS = 30;
    HISTORY_MILSEC_TO_PROCESS = this.HISTORY_DAYS_TO_PROCESS * 24*60*60*1000;
    lastUpdateTime = Date.now();
    lastDiscordStatusTime = Date.now();

    /**
     * Handles the actual sending request.
     * We're turning the https.request into a promise here for convenience
     * @param webhookURL
     * @param messageBody
     * @return {Promise}
     */
    async constructCharacterStats (character_id) {
        return await this.getCharacterKills(character_id);
    }

    async getZKBCharacterStats(character_id) {
        const response = await fetch(` https://zkillboard.com/api/stats/characterID/${character_id}/`, { headers: this.zkillHeaders });
        if (response.status >= 400) {
            throw new Error("Bad response from server for character stats (id=" + character_id + ")");
        }

        return await response.json();
    }

    async getZKBCorporationStats(corporation_id) {
        const response = await fetch(` https://zkillboard.com/api/stats/corporationID/${corporation_id}/`, { headers: this.zkillHeaders });
        if (response.status >= 400) {
            throw new Error("Bad response from server for corporation stats (id=" + corporation_id + ")");
        }

        return await response.json();
    }

    async processKillMailsForSingleCharacter(listOfKms, character) {
        console.log("Processing KMs for Single Char: " + character.name);
        console.time("timer1");

        const responses = await Promise.allSettled(
            listOfKms.map(async kmTuple => {
                const resp =  await fetch(
                    `https://esi.evetech.net/latest/killmails/${kmTuple[0]}/${kmTuple[1]}/?datasource=tranquility`, { headers: this.zkillHeaders }
                ); // Send request for each id

                return resp.json();
            })
        );
        const data = await Promise.all(responses.map(r => r.value))
        console.timeEnd("timer1");

        if (data) {
            for (const km of data) {
                // if the km is > than X days old, stop processing
                if (!km.killmail_time) {
                    var x = 0;
                }
                else if (new Date(Date.parse(km.killmail_time) + this.HISTORY_MILSEC_TO_PROCESS) < Date.now()) {
                    return false;
                }

                // check if the km contains a marauder
                var marauderCheck = false;
                for (const atkr of km.attackers) {
                    var shipType = atkr.ship_type_id ? atkr.ship_type_id.toString() : '0';
                    if (this.MARAUDER_IDS.includes(shipType)) { 
                        marauderCheck=true;
                        break; 
                    }
                }

                character.kills.pilots_involved.marauder += marauderCheck  ? 1 : 0;

                var attackerCount = km.attackers.length;
                if (attackerCount == 1) {
                    character.kills.pilots_involved.solo += 1;
                }
                else if (attackerCount < 5) {
                    character.kills.pilots_involved.five += 1;
                }
                else if (attackerCount < 10) {
                    character.kills.pilots_involved.ten += 1;
                }
                else if (attackerCount < 15) {
                    character.kills.pilots_involved.fifteen += 1;
                }
                else if (attackerCount < 20) {
                    character.kills.pilots_involved.twenty += 1;
                }
                else if (attackerCount < 30) {
                    character.kills.pilots_involved.thirty += 1;
                }
                else if (attackerCount < 40) {
                    character.kills.pilots_involved.forty += 1;
                }
                else if (attackerCount < 50) {
                    character.kills.pilots_involved.fifty += 1;
                }
                else if (attackerCount >= 50) {
                    character.kills.pilots_involved.blob += 1;
                } 
            }
        }
        return true;
    }

    async getCharacterKills(character_id) {
        console.log("Getting char kills for id " + character_id);

        const response = await fetch('https://zkillboard.com/api/characterID/' + character_id + '/', { headers: this.zkillHeaders });
        if (response.status >= 400) {
            throw new Error("Bad response from server for character (id=" + character_id + ")");
        }

        const data = await response.json();

        if (data) {
            const dbConnect = dbo.getDb();

            var attChar = await dbConnect.collection('characters').findOne({"character_id":  character_id});
            // If not found in the db, get from zkb
            if (!attChar) {
                attChar = new Character(character_id, null, null)
                await sleep(1500);
                var zkbChar = await this.getZKBCharacterStats(character_id);
                if (zkbChar) {
                    attChar.corporation_id = zkbChar.info.corporation_id;
                    attChar.name = zkbChar.info.name;
                    attChar.kills.all_time_count = zkbChar.shipsDestroyed;
                    attChar.losses.all_time_count = zkbChar.shipsLost;
                }
            }
            else {
                const right_now = new Date();
                if (!attChar.first_load_date) {
                    attChar.first_load_date = new Date();
                }
                else if (Math.round((right_now - attChar.first_load_date) / (1000 * 60 * 60 * 24)) > 1) {
                    attChar.clearStats();
                }
            }

            if (data.length > 0) {
                // If the last killmail processed is the same as the first in the list from zkb, char is up to date
                if (attChar.last_killmail_id == data[0].killmail_id) {
                    return attChar;
                }
       
                var listOfKMs = [];
                for (const km of data) {
                    if (attChar.last_killmail_id < km.killmail_id) {
                        listOfKMs.push([km.killmail_id, km.zkb.hash]);
                    }
                }
                attChar.last_killmail_id = data[0].killmail_id;
                const result0 = await this.processKillMailsForSingleCharacter(listOfKMs, attChar);
                console.log("Finished processing killmails");
                const result = await dbConnect.collection('characters').replaceOne({ character_id: character_id }, attChar, { upsert: true });
            }
            return attChar;
        }

    }

    makeLink(url,title) {
        return `<a href="${url}" target="_blank">${title}</a>`
    }

    makeZALink(allianceId,title) {
        return this.makeLink(`https://zkillboard.com/alliance/${allianceId}/`, title)
    }

    makeZCLink(corpId,title) {
        return this.makeLink(`https://zkillboard.com/corporation/${corpId}/`, title)
    }

    makeZSLink(systemId,title) {
        return this.makeLink(`https://zkillboard.com/system/${systemId}/`, title)
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getCharacterStats() {
    var x = new CharacterStats();

    // perform a database connection when the server starts
    dbo.connectToServer(async function (err) {
        if (err) {
            console.error(err);
            process.exit();
        }

        try {
            //var stats = await x.constructCharacterStats(605249834);
            var stats = await x.constructCharacterStats(640170087);
        }
        finally {
            dbo.closeDB();
        }
    });

}
//getCharacterStats();
module.exports = { CharacterStats }
