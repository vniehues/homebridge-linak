/* eslint-disable no-console */
import { Service, PlatformAccessory } from 'homebridge';
import { ExampleHomebridgePlatform } from './platform';

import noble from '@abandonware/noble';

// const UUID_HEIGHT = '99fa0021-338a-1024-8a49-009c0215f78a';
// const UUID_COMMAND = '99fa0002-338a-1024-8a49-009c0215f78a';
// const UUID_REFERENCE_INPUT = '99fa0031-338a-1024-8a49-009c0215f78a';

// const COMMAND_UP = bytearray(struct.pack("<H", 71))
// const COMMAND_DOWN = bytearray(struct.pack("<H", 70))
// const COMMAND_STOP = bytearray(struct.pack("<H", 255))
//
// const COMMAND_REFERENCE_INPUT_STOP = bytearray(struct.pack("<H", 32769))
// const COMMAND_REFERENCE_INPUT_UP = bytearray(struct.pack("<H", 32768))
// const COMMAND_REFERENCE_INPUT_DOWN = bytearray(struct.pack("<H", 32767))

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class ExamplePlatformAccessory {
  private service: Service;


  constructor(
    private readonly platform: ExampleHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    noble.on('stateChange', async (state) => {
      if (state === 'poweredOn') {
        console.log('Scanning for: ', accessory.context.device.macAddress);
        // await noble.startScanningAsync();
        await noble.startScanningAsync();
      }
    });

    noble.on('warning', async (message) => {
      console.log(message);
    });

    noble.on('discover', async (peripheral) => {
      console.log('discovered: ', peripheral.address);
      if (peripheral.address === accessory.context.device.macAddress) {
        console.log('connecting to: ', peripheral);
        await noble.stopScanningAsync();
        await peripheral.connectAsync();
        const {characteristics} = await peripheral.discoverSomeServicesAndCharacteristicsAsync(['180f'], ['2a19']);
        const batteryLevel = (await characteristics[0].readAsync())[0];

        console.log(`${peripheral.address} (${peripheral.advertisement.localName}): ${batteryLevel}%`);

        await peripheral.disconnectAsync();
        process.exit(0);

      }
    });

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Default-Manufacturer')
      .setCharacteristic(this.platform.Characteristic.Model, 'Default-Model')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.WindowCovering)
        || this.accessory.addService(this.platform.Service.WindowCovering);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.exampleDisplayName);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb
    // create handlers for required characteristics

    this.service.getCharacteristic(this.platform.Characteristic.CurrentPosition)
      .onGet(this.handleCurrentPositionGet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.PositionState)
      .onGet(this.handlePositionStateGet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.TargetPosition)
      .onGet(this.handleTargetPositionGet.bind(this))
      .onSet(this.handleTargetPositionSet.bind(this));

    /**
     * Creating multiple services of the same type.
     *
     * To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
     * when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
     * this.accessory.getService('NAME') || this.accessory.addService(this.platform.Service.Lightbulb, 'NAME', 'USER_DEFINED_SUBTYPE_ID');
     *
     * The USER_DEFINED_SUBTYPE must be unique to the platform accessory (if you platform exposes multiple accessories, each accessory
     * can use the same sub type id.)
     */
  }

  /**
   * Handle requests to get the current value of the "Current Position" characteristic
   */
  handleCurrentPositionGet() {
    this.platform.log.debug('Triggered GET CurrentPosition');

    const heightPercent = 50;

    return heightPercent;
  }


  /**
   * Handle requests to get the current value of the "Position State" characteristic
   */
  handlePositionStateGet() {
    this.platform.log.debug('Triggered GET PositionState');

    // set this to a valid value for PositionState
    const currentValue = this.platform.Characteristic.PositionState.DECREASING;

    return currentValue;
  }


  /**
   * Handle requests to get the current value of the "Target Position" characteristic
   */
  handleTargetPositionGet() {
    this.platform.log.debug('Triggered GET TargetPosition');

    // set this to a valid value for TargetPosition
    const currentValue = 1;

    return currentValue;
  }

  /**
   * Handle requests to set the "Target Position" characteristic
   */
  handleTargetPositionSet(value) {
    this.platform.log.debug('Triggered SET TargetPosition:', value);

    // exec("idasen-controller", (error, stdout, stderr) => {
    //   var heightStr = stdout.split(":")[1].split("mm")[0];
    //   var height: number = +heightStr;
    //   var heightPercent = height/6.5 - 95;
    //   return heightPercent;
    // });
  }
}
