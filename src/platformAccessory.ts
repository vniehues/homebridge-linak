import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { ExampleHomebridgePlatform } from './platform';

const { exec } = require("child_process");
const controller = require('idasen-controller');

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class ExamplePlatformAccessory {
  private service: Service;



  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private exampleStates = {
    On: false,
    Brightness: 100,
  };

  constructor(
    private readonly platform: ExampleHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Default-Manufacturer')
      .setCharacteristic(this.platform.Characteristic.Model, 'Default-Model')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.WindowCovering) || this.accessory.addService(this.platform.Service.WindowCovering);

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

    var heightPercent : number = 50;
    
    var command = "idasen-controller --mac-address " + ;
    
    exec(command, (error, stdout, stderr) => {
      var heightStr = stdout.split(":")[1].split("mm")[0];
      var height: number = +heightStr;
      heightPercent = height/6.5 - 95;
    });
    
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
    
    exec("idasen-controller", (error, stdout, stderr) => {
      var heightStr = stdout.split(":")[1].split("mm")[0];
      var height: number = +heightStr;
      var heightPercent = height/6.5 - 95;
      return heightPercent;
    });
  }
}
