var util = require('util');
var bleno = require('@abandonware/bleno');

var FoodBankCharacteristic = require('./food-bank-characteristic');

// create food bank service, then register food bank characteristic to it
function FoodBankService() {
    bleno.PrimaryService.call(this, {
        uuid: '10000000-0000-0000-0000-000000000001'.replace(/\-/gi, ""),
        characteristics: [
            new FoodBankCharacteristic(),
        ]
    });
}

util.inherits(FoodBankService, bleno.PrimaryService);

module.exports = FoodBankService;
