/**
 * Sample BLE React Native App
 *
 * @format
 * @flow strict-local
 */

import React, {
  useState,
  useEffect,
} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  StatusBar,
  NativeModules,
  NativeEventEmitter,
  Button,
  Platform,
  PermissionsAndroid,
  FlatList,
  TouchableHighlight,
} from 'react-native';

import {
  Colors,
} from 'react-native/Libraries/NewAppScreen';

import BleManager from 'react-native-ble-manager';
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

import { stringToBytes } from "convert-string";

const Buffer = require('buffer/').Buffer;

const App = () => {
  const [isScanning, setIsScanning] = useState(false);
  const peripherals = new Map();
  const [list, setList] = useState([]);
  const [testMode, setTestMode] = useState('read')

  const startScan = () => {
    if (isScanning) {
      return
    }

    setList(Array.from([]));
    BleManager.scan([], 3, true).then((results) => {
      console.log('Scanning...');
      setIsScanning(true);
    }).catch(err => {
      console.error(err);
    });
  }

  const handleStopScan = () => {
    console.log('Scan is stopped');
    setIsScanning(false);
  }

  const handleDisconnectedPeripheral = (data) => {
    let peripheral = peripherals.get(data.peripheral);
    if (peripheral) {
      peripheral.connected = false;
      peripherals.set(peripheral.id, peripheral);
      setList(Array.from(peripherals.values()));
    }
    console.log('Disconnected from ' + data.peripheral);
  }

  const handleUpdateValueForCharacteristic = (data) => {
    console.log('Received data from ' + data.peripheral + ' characteristic ' + data.characteristic, data.value);
  }

  const handleDiscoverPeripheral = (peripheral) => {
    console.log('Got ble peripheral', peripheral);
    if (!peripheral.name) {
      peripheral.name = 'NO NAME';
    }
    peripherals.set(peripheral.id, peripheral);
    setList(Array.from(peripherals.values()));
  }

  // const retrieveConnected = () => {
  //   BleManager.getConnectedPeripherals([]).then((results) => {
  //     if (results.length == 0) {
  //       console.log('No connected peripherals')
  //     }
  //     console.log(results);
  //     for (var i = 0; i < results.length; i++) {
  //       var peripheral = results[i];
  //       peripheral.connected = true;
  //       peripherals.set(peripheral.id, peripheral);
  //       setList(Array.from(peripherals.values()));
  //     }
  //   });
  // }

  const connectAndTestPeripheral = (peripheral) => {
    if (peripheral){
      if (peripheral.connected){
        BleManager.disconnect(peripheral.id);
      }else{
        BleManager.connect(peripheral.id).then(() => {
          let p = peripherals.get(peripheral.id);
          if (p) {
            p.connected = true;
            peripherals.set(peripheral.id, p);
            setList(Array.from(peripherals.values()));
          }
          console.log('Connected to ' + peripheral.id, peripheral);

          setTimeout(() => {

            /* Test read current RSSI value */
            BleManager.retrieveServices(peripheral.id).then((peripheralData) => {
              console.log('Retrieved peripheral services', peripheralData);

              BleManager.readRSSI(peripheral.id).then((rssi) => {
                console.log('Retrieved actual RSSI value', rssi);
                let p = peripherals.get(peripheral.id);
                if (p) {
                  p.rssi = rssi;
                  peripherals.set(peripheral.id, p);
                  setList(Array.from(peripherals.values()));
                }                
              });                                          
            });

            // Test using bleno's pizza example
            // https://github.com/sandeepmistry/bleno/tree/master/examples/pizza

            BleManager.retrieveServices(peripheral.id).then((peripheralInfo) => {
              console.log('peripheral info', peripheralInfo);

              const serviceUUID = '10000000-0000-0000-0000-000000000001';
              const charasteristicUUID = '20000000-0000-0000-0000-000000000001';

              console.log('peripheral id:', peripheral.id);
              console.log('service:', serviceUUID);
              console.log('characteristic:', charasteristicUUID);

              setTimeout(() => {

                switch (testMode) {

                  case 'write':
                    // ===== test write data
                    const payload = 'pizza'
                    const payloadBytes = stringToBytes(payload);
                    console.log('payload:', payload);

                    BleManager.write(peripheral.id, serviceUUID, charasteristicUUID, payloadBytes).then((res) => {
                      console.log('write response', res);
                      alert(`your "${payload}" is stored to the food bank. Thank you!`)
                    }).catch((error) => {
                      console.log('write err', error);
                    });
                    break

                  case 'read':
                    // ===== test read data
                    BleManager.read(peripheral.id, serviceUUID, charasteristicUUID).then((res) => {
                      console.log('read response', res);
                      if (res) {
                        const buffer = Buffer.from(res);
                        const data = buffer.toString();
                        console.log('data', data);
                        alert(`you have stored food "${data}"`)
                      }
                    }).catch((error) => {
                      console.log('read err', error);
                      alert(error)
                    });
                    break
  
                  case 'notify':
                    // ===== test subscribe notification
                    BleManager.startNotification(peripheral.id, serviceUUID, charasteristicUUID).then((res) => {
                      console.log('start notification response', res);
                    })
                    break
                  
                  default:
                    break
                }
              }, 500);
            });

          }, 900);
        }).catch((error) => {
          console.log('Connection error', error);
        });
      }
    }
  }

  useEffect(() => {
    BleManager.start({showAlert: false});

    bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', handleDiscoverPeripheral);
    bleManagerEmitter.addListener('BleManagerStopScan', handleStopScan );
    bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', handleDisconnectedPeripheral );
    bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', handleUpdateValueForCharacteristic );

    if (Platform.OS === 'android' && Platform.Version >= 23) {
      PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION).then((result) => {
          if (result) {
            console.log("Permission is OK");
          } else {
            PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION).then((result) => {
              if (result) {
                console.log("User accept");
              } else {
                console.log("User refuse");
              }
            });
          }
      });
    }  
    
    return (() => {
      console.log('unmount');
      bleManagerEmitter.removeListener('BleManagerDiscoverPeripheral', handleDiscoverPeripheral);
      bleManagerEmitter.removeListener('BleManagerStopScan', handleStopScan );
      bleManagerEmitter.removeListener('BleManagerDisconnectPeripheral', handleDisconnectedPeripheral );
      bleManagerEmitter.removeListener('BleManagerDidUpdateValueForCharacteristic', handleUpdateValueForCharacteristic );
    })
  }, []);

  const getPeripheralName = (item) => {
    // if (item.advertising) {
    //   if (item.advertising.localName) {
    //     return item.advertising.localName
    //   }
    // }

    return item.name
  }

  const renderItem = (item) => {
    const color = item.connected ? 'green' : '#fff';
    return (
      <TouchableHighlight onPress={() => connectAndTestPeripheral(item) }>
        <View style={[styles.row, {backgroundColor: color}]}>
          <Text style={{fontSize: 12, textAlign: 'center', color: '#333333', padding: 10}}>{getPeripheralName(item)}</Text>
          <Text style={{fontSize: 10, textAlign: 'center', color: '#333333', padding: 2}}>RSSI: {item.rssi}</Text>
          <Text style={{fontSize: 8, textAlign: 'center', color: '#333333', padding: 2, paddingBottom: 20}}>{item.id}</Text>
        </View>
      </TouchableHighlight>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{flex: 1}}>

        {/* header */}
        <View style={styles.body}>
          
          <View style={{margin: 10}}>
            <Button 
              title={'Scan Bluetooth Devices'}
              onPress={() => startScan() } 
            />            
          </View>

          {/* <View style={{margin: 10}}>
            <Button title="Retrieve connected peripherals" onPress={() => retrieveConnected() } />
          </View> */}

          {(list.length == 0) &&
            <View style={{flex:1, margin: 20}}>
              <Text style={{textAlign: 'center'}}>No peripherals</Text>
            </View>
          }
        </View>

        {/* ble devices */}
        <FlatList
          data={list}
          renderItem={({ item }) => renderItem(item) }
          keyExtractor={item => item.id}
        />

        {/* bottom footer */}
        <View style={styles.footer}>
          <TouchableHighlight onPress={() => setTestMode('write') }>
            <View style={[styles.row, styles.footerButton]}>
              <Text>Store pizza</Text>
            </View>
          </TouchableHighlight>
          <TouchableHighlight onPress={() => setTestMode('read') }>
            <View style={[styles.row, styles.footerButton]}>
              <Text>Get stored food</Text>
            </View>
          </TouchableHighlight>
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    backgroundColor: Colors.lighter,
  },
  engine: {
    position: 'absolute',
    right: 0,
  },
  body: {
    backgroundColor: Colors.white,
  },
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.black,
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
    color: Colors.dark,
  },
  highlight: {
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 30,
  },
  footerButton: {
    alignSelf: 'stretch',
    padding: 10,
    backgroundColor: 'grey',
  }
});

export default App;
