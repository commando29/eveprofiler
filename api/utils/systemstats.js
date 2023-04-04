const path = require('path')
const fetch = require('cross-fetch');
require('dotenv').config({ path: path.resolve(__dirname, '../config.env'), dotenv_config_debug:true });
//import Character from '../model/character.js';
//import Corporation from '../model/corporation.js';
const { Character } = require("../model/character.js");
const { Corporation } = require("../model/corporation.js");
const dbo = require('../db/conn');

// config object
class SystemStats {
    constructor() {

        this.zkillHeaders = {
            'Accept-Encoding': 'gzip',
            'User-Agent': 'PathfinderStatsScript',
            'Maintainer': 'Caleb bcartwright29@gmail.com'
        };

    }
    HISTORY_DAYS_TO_PROCESS = 30;
    systems = [];
    lastUpdateTime = Date.now();
    lastDiscordStatusTime = Date.now();
    systemDescription = '';

    /**
     * Handles the actual sending request.
     * We're turning the https.request into a promise here for convenience
     * @param webhookURL
     * @param messageBody
     * @return {Promise}
     */
    async constructSystemStats (systemId, systemName) {
        return await this.getSystemKills(systemId);
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

    async processKillMail(killmailId, killmailHash) {
        const response = await fetch(`https://esi.evetech.net/latest/killmails/${killmailId}/${killmailHash}/?datasource=tranquility`);
        if (response.status >= 400) {
            throw new Error("Bad response from server for system stats (id=" + systemId + ")");
        }

        const data = await response.json();
        var corps= [];
        
        if (data) {
            const dbConnect = dbo.getDb();

            for (const attacker of data.attackers) {
                var attChar = await dbConnect.collection('characters').findOne({"character_id":  attacker.character_id});

                // If not found in the db, get from zkb
                if (!attChar) {
                    attChar = new Character(attacker.character_id, null, null)
                    await sleep(1500); 
                    var zkbChar = await this.getZKBCharacterStats(attacker.character_id);
                    if (zkbChar) {
                        attChar.corporation_id = zkbChar.info.corporation_id;
                        attChar.name = zkbChar.info.name;
                    }
                }
                

                var isNewCorp = false;
                var attCorp = corps.find(obj => obj.id == attacker.corporation_id);
                if (!attCorp) {
                    isNewCorp = true;   // We only want to process a corp once for each km
                    attCorp = await dbConnect.collection('corporations').findOne({"corporation_id":  attacker.corporation_id});

                    if (!attCorp) {
                        attCorp = new Corporation(attacker.corporation_id, null, null)
                        await sleep(1500);
                        var zkbCorp = await this.getZKBCorporationStats(attacker.corporation_id);
                        if (zkbCorp) {
                            attCorp.name = zkbCorp.info.name;
                        }
                    }
                    corps.push(attCorp);
                }

                var attackerCount = data.attackers.length;
                if (attackerCount == 1) {   
                    attChar.kills.pilots_involved["solo"] += 1;  
                    if (isNewCorp) {    attCorp.kills.pilots_involved["solo"] += 1;  }
                }  
                else if (attackerCount < 5) {   
                    attChar.kills.pilots_involved["five"] += 1;  
                    if (isNewCorp) {    attCorp.kills.pilots_involved["five"] += 1;  }
                }  
                else if (attackerCount < 10) {   
                    attChar.kills.pilots_involved["ten"] += 1;  
                    if (isNewCorp) {    attCorp.kills.pilots_involved["ten"] += 1;  }
                }  
                else if (attackerCount < 15) {   
                    attChar.kills.pilots_involved["fifteen"] += 1;  
                    if (isNewCorp) {    attCorp.kills.pilots_involved["fifteen"] += 1;  }
                }  
                else if (attackerCount < 20) {   
                    attChar.kills.pilots_involved["twenty"] += 1;  
                    if (isNewCorp) {    attCorp.kills.pilots_involved["twenty"] += 1;  }
                }  
                else if (attackerCount < 30) {   
                    attChar.kills.pilots_involved["thirty"] += 1;  
                    if (isNewCorp) {    attCorp.kills.pilots_involved["thirty"] += 1;  }
                }  
                else if (attackerCount < 40) {   
                    attChar.kills.pilots_involved["forty"] += 1;  
                    if (isNewCorp) {    attCorp.kills.pilots_involved["forty"] += 1;  }
                }  
                else if (attackerCount < 50) {   
                    attChar.kills.pilots_involved["fifty"] += 1;  
                    if (isNewCorp) {    attCorp.kills.pilots_involved["fifty"] += 1;  }
                }  
                else if (attackerCount >= 50) {   
                    attChar.kills.pilots_involved["blob"] += 1;  
                    if (isNewCorp) {    attCorp.kills.pilots_involved["blob"] += 1;  }
                }  
                  
            }
        }
    }

    async getSystemKills(systemId) {


        const response = await fetch('https://zkillboard.com/api/solarSystemID/' + systemId + '/', { headers: this.zkillHeaders });
        if (response.status >= 400) {
            throw new Error("Bad response from server for system stats (id=" + systemId + ")");
        }

        const data = await response.json();

        var corpIds = [];

        this.systemDescription = '';
        //this.systemDescription = `-- Automatic Intel System for ${this.makeZSLink(data.info.id, data.info.name)} pulling last 30 days <br><br> nbsp; &nbsp; &nbsp;${new Date().toString()}<br>`;

        if (data) {
            for (const km of data) {
                await this.processKillMail(km.killmail_id, km.zkb.hash);
            }
        }
        return this.systemDescription;

    }

    /*async getCorpString(corpId) {
        var corpString = '';
        console.log('getting corp string for id =' + corpId);
        let corpData = await this.getCorpStats(corpId);
        if (corpData) {
            var corpActivePvp = 'None';
            if (corpData.activepvp && corpData.activepvp.kills) {
                corpActivePvp = `${corpData.activepvp.kills.count} kills and losses `
                if (corpData.activepvp.characters) {
                    corpActivePvp += `(${corpData.activepvp.characters.count}/${corpData.info.memberCount}) Characters`
                }
            }
            corpString += `${this.makeZCLink(corpId, corpData.info.name)}: 7 day activity: ${corpActivePvp}\n`;

            if (corpData.activity) {
                var activityTotals = new Array(24); 
                var maxActivity = 0;
                for(let hourIndex=0;hourIndex<24;hourIndex++) {
                    var total = 0; 
                    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                        if (corpData.activity[dayIndex]) {
                            total += corpData.activity[dayIndex][hourIndex];
                        }
                    }
                    activityTotals[hourIndex] =total;
                    maxActivity = maxActivity < total ? total : maxActivity; 
                }

                var activityString = '';
                var spanCounter = 0;
                for(let hourIndex=0;hourIndex<24;hourIndex++) {
                    if (activityTotals[hourIndex] >= (maxActivity * (this.activityMinPercentage/100))) {
                        if (spanCounter == 0) {
                            activityString += ` [${hourIndex}`;
                        }
                        spanCounter++;
                    }
                    else {
                        if (spanCounter > 1) {
                            activityString += `-${hourIndex-1}]`;
                        }
                        else if (spanCounter == 1) {
                            activityString += ']';
                        }
                        spanCounter = 0;
                    }
                }

                // Check if the last item was in a span
                if (spanCounter > 0) { activityString += '-0]'; }

                corpString += activityString + ' Eve Timezone Active \n';
            }
            else {
                corpString += ' No activity found. \n';
            }
        }

        return corpString;
    }

    async getCorpStats(corpId) {
        const response = await fetch('https://zkillboard.com/api/stats/corporationID/' + corpId + '/', { headers: this.zkillHeaders });
        if (response.status >= 400) {
            throw new Error("Bad response from server for corp stats (id=" + corpId + ")");
        }
        return await response.json();
    }

    async getAllianceStats(allianceId) {
        const response = await fetch('https://zkillboard.com/api/stats/allianceID/' + allianceId + '/', { headers: this.zkillHeaders });
        if (response.status >= 400) {
            throw new Error("Bad response from server for alliance stats (id=" + allianceId + ")");
        }
        return await response.json();
    }*/

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

async function getStats() {
    var x = new SystemStats();

    // perform a database connection when the server starts
    dbo.connectToServer(async function (err) {
        if (err) {
            console.error(err);
            process.exit();
        }

        try {
            var stats = await x.constructSystemStats(31002229);
        }
        finally {
            dbo.closeDB();
        }
    });

}
getStats();