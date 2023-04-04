class Character {
    constructor(id, name, corpId) {
        this.name = name;
        this.character_id = id;
        this.corporation_id = corpId;
        this.description = "";
        this.activeTimes = "";
        this.kills = {};
        this.losses = {};
        this.kills.pilots_involved = {};
        this.last_killmail_id = 0;
        this.first_load_date = new Date(); 
        this.clearStats();
    }
  
    clearStats() {
        this.kills.all_time_count = 0;
        this.losses.all_time_count = 0;

        this.kills.pilots_involved.solo = 0;
        this.kills.pilots_involved.five = 0;
        this.kills.pilots_involved.ten = 0;
        this.kills.pilots_involved.fifteen = 0;
        this.kills.pilots_involved.twenty = 0;
        this.kills.pilots_involved.thirty = 0;
        this.kills.pilots_involved.forty = 0;
        this.kills.pilots_involved.fifty = 0;
        this.kills.pilots_involved.blob = 0;
        this.kills.pilots_involved.marauder = 0;
    }
}

module.exports = { Character }


