class Corporation {
    constructor(id, name) {
        this.name = name;
        this.corporation_id = id;
        this.description = "";
        this.activeTimes = "";
        this.activePilots = 0;
        this.totalPilots = 0;
        this.kills = {};
        this.kills.pilots_involved = [];
        this.losses = {};
        this.kills.count = 0;
        this.losses.count = 0;


        this.kills.pilots_involved["solo"] = 0;
        this.kills.pilots_involved["five"] = 0;
        this.kills.pilots_involved["ten"] = 0;
        this.kills.pilots_involved["fifteen"] = 0;
        this.kills.pilots_involved["twenty"] = 0;
        this.kills.pilots_involved["thirty"] = 0;
        this.kills.pilots_involved["forty"] = 0;
        this.kills.pilots_involved["fifty"] = 0;
        this.kills.pilots_involved["blob"] = 0;
    }
  
    testFunction() {
      
    }
}

module.exports = { Corporation }