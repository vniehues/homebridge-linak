/* eslint-disable no-console */
import { Service, PlatformAccessory } from 'homebridge';
import { LinakDeskPlatform } from './platform';
import { execSync } from 'child_process';

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
export class DeskAccessory {
  private service: Service;
  private currentPos = 40;
  private isMoving = false;
  private isPolling = false;

  private requestedPos = -1;

  private requestedPosTimer;



  constructor(
    private readonly platform: LinakDeskPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

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
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);

    // Initialize our state as stopped.
    this.service.setCharacteristic(this.platform.Characteristic.PositionState, this.platform.Characteristic.PositionState.STOPPED);

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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const interval = setInterval(() => {
      // method to be executed;
      this.poll();
    }, this.platform.config.pollingRate | 25000);

    //  clearInterval(interval);
  }

  poll() {
    if (!this.isMoving && !this.isPolling) {

      this.isPolling = true;

      const pollcommand = this.platform.config.idasenControllerPath + ' --mac-address ' + this.accessory.context.device.macAddress;

      try {
        const output = execSync(pollcommand)

        this.platform.log.debug("Polling output: ",output);

        const position = output.toString();

        if (position === null || position === '') {
          return;
        }

        const heightStr = position.split('Height:')[1].split('mm')[0];

        const height_rel: number = +heightStr / 6.5 - 95;

        const currentValue = Math.round(height_rel);

        this.platform.log.debug('found height%: ', currentValue);

        //Don't update while moving. Might interrupt movement!
        if (!this.isMoving) {
          this.platform.log.debug('Updating polled values!');

          this.currentPos = currentValue;

          this.service.getCharacteristic(this.platform.Characteristic.CurrentPosition).updateValue(this.currentPos);
          this.service.getCharacteristic(this.platform.Characteristic.TargetPosition).updateValue(this.currentPos);
        } else{
          this.platform.log.debug('Not updating polled values because we are moving!');
        }
      } catch (error) {
        this.platform.log.debug('polling error:', error);
      } finally {
        this.isPolling = false;
      }
    }
  }

  moveToPercent(percentage: number) {
    let newheight = 620 + percentage / 100 * 650;
    newheight = Math.round(newheight);
    if (newheight === 620) {
      newheight = 621;
    }

    const moveCommand = this.platform.config.idasenControllerPath + ' --mac-address '
        + this.accessory.context.device.macAddress + ' --move-to ' + newheight;

    try {
      //needs to run sync so that we can wait for it.
      execSync(moveCommand);
    } catch (error) {
      this.platform.log.debug('moving error:', error);
    } finally {


      this.service.getCharacteristic(this.platform.Characteristic.TargetPosition).updateValue(percentage);
      this.service.getCharacteristic(this.platform.Characteristic.CurrentPosition).updateValue(percentage);
      this.service.getCharacteristic(this.platform.Characteristic.PositionState)
        .updateValue(this.platform.Characteristic.PositionState.STOPPED);

      this.isMoving = false;
    }
  }


  /**
     * Handle requests to get the current value of the "Current Position" characteristic
     */
  handleCurrentPositionGet() {
    this.platform.log.debug('Triggered GET CurrentPosition');
    return this.currentPos;
  }


  /**
   * Handle requests to get the current value of the "Position State" characteristic
   */
  handlePositionStateGet() {
    this.platform.log.debug('Triggered GET PositionState');

    // set this to a valid value for PositionState
    const currentValue = this.platform.Characteristic.PositionState.STOPPED;

    return currentValue;
  }


  /**
   * Handle requests to get the current value of the "Target Position" characteristic
   */
  handleTargetPositionGet() {
    this.platform.log.debug('Triggered GET TargetPosition');
    return this.currentPos;
  }


  /**
   * Handle requests to set the "Target Position" characteristic
   */
  handleTargetPositionSet(value) {
    this.platform.log.debug('Triggered SET TargetPosition:', value);

    // We're moving. We don't want any status refreshes until we complete the move.
    this.isMoving = true;

    clearTimeout(this.requestedPosTimer);
    this.requestedPosTimer = setTimeout(() => {

      this.platform.log.debug('executing move to: ', value);

      if (value === this.currentPos) {
        this.isMoving = false;

        this.service.getCharacteristic(this.platform.Characteristic.TargetPosition).updateValue(this.currentPos);
        this.service.getCharacteristic(this.platform.Characteristic.CurrentPosition).updateValue(this.currentPos);
        this.service.getCharacteristic(this.platform.Characteristic.PositionState)
          .updateValue(this.platform.Characteristic.PositionState.STOPPED);

        return;
      }


      const moveUp = value > this.currentPos;
      // const targetPosition = value;
      const positionState = moveUp ? this.platform.Characteristic.PositionState.INCREASING
        : this.platform.Characteristic.PositionState.DECREASING;

      // Tell HomeKit we're on the move.
      this.service.getCharacteristic(this.platform.Characteristic.PositionState).updateValue(positionState);

      setTimeout(() => this.moveToPercent(value), 100);

    }, 2500);
  }
}
