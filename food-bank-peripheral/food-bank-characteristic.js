var util = require('util');
var bleno = require('@abandonware/bleno');

// prepare food bank characteristic
function FoodBankCharacteristic() {
  bleno.Characteristic.call(this, {
    uuid: '20000000-0000-0000-0000-000000000001'.replace(/\-/gi, ""),
    properties: ['read', 'write', 'notify'],
    descriptors: [
      new bleno.Descriptor({
        uuid: '2901',
        value: 'Give or ask food'
      })
    ]
  });

  this._storedFood = null;
  this._updateValueCallback = null;
}

util.inherits(FoodBankCharacteristic, bleno.Characteristic);

// handle on write request with payload
FoodBankCharacteristic.prototype.onWriteRequest = function(data, offset, withoutResponse, callback) {
  console.log('incoming write request')

  if (offset) {
    callback(this.RESULT_ATTR_NOT_LONG);
    return;
  }
  
  if (data.length === 0) {
    callback(this.RESULT_INVALID_ATTRIBUTE_LENGTH);
    return;
  }

  // if subscription active, notify every write request
  if (this._updateValueCallback) {
    this._updateValueCallback(data)
  }
  
  // store data, then write response
  this._storedFood = data;
  console.log('storing food:', data.toString());
  callback(this.RESULT_SUCCESS);
};

// handle on read request
FoodBankCharacteristic.prototype.onReadRequest = function(offset, callback) {
  console.log('incoming read request')

  if (offset) {
    callback(this.RESULT_ATTR_NOT_LONG, null);
    return;
  }

  // get data, then write response
  var data = this._storedFood ? this._storedFood.toString() : 'you have no food stored';
  console.log('getting food:', data);
  callback(this.RESULT_SUCCESS, Buffer.from(data, 'utf8'));
};

// handle on subscribe
FoodBankCharacteristic.prototype.onSubscribe = function(maxValueSize, updateValueCallback) {
  console.log('on subscribe');

  this._updateValueCallback = updateValueCallback;
};

// handle on unsubscribe
FoodBankCharacteristic.prototype.onUnsubscribe = function() {
  console.log('on unsubscribe');

  this._updateValueCallback = null;
};

module.exports = FoodBankCharacteristic;