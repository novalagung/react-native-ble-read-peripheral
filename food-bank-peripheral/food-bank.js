var bleno = require('@abandonware/bleno');

var FoodBankService = require('./food-bank-service');

var name = 'Food Bank';
var foodBankService = new FoodBankService();

// wait until the BLE radio powers on before attempting to advertise.
// if BLE radio is unavailable, then this event will never be called.
bleno.on('stateChange', function (state) {
  if (state === 'poweredOn') {

    // start to advertise service id, making it easie to find.
    bleno.startAdvertising(name, [foodBankService.uuid], function (err) {
      if (err) {
        console.log('start advertising error', err);
      }
    });

    return;
  }

  bleno.stopAdvertising();
});

// handle on advertising start event
bleno.on('advertisingStart', function (err) {
  if (err) {
    console.log('start advertising error', err);
    return;
  }
  
  // once we are advertising, it's time to set up our services,
  // along with our characteristics.
  console.log('advertising...');
  bleno.setServices([
    foodBankService
  ]);
});
