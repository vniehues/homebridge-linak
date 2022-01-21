/* eslint-disable no-console */
import {PlatformAccessory, Service} from 'homebridge';
import {LinakDeskPlatform} from './platform';
import {exec} from 'child_process';

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
  private currentlyRequestingMove = false;

  private currentPollProcess;
  private currentMoveProcess;

  private requestedPosTimer;

  private baseCommand;
  private serverCommand;


  private maxRetries = 3;
  private currentMoveRetry = 0;



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


    this.platform.log.debug('configuring desk: ', this.accessory.context.device);
    this.baseCommand = this.platform.config.idasenControllerPath + ' --forward '
        + ' --mac-address ' + this.accessory.context.device.macAddress
        + ' --base-height ' + this.accessory.context.device.baseHeight
        + ' --movement-range ' + this.accessory.context.device.movementRange;

    this.serverCommand = this.platform.config.idasenControllerPath + ' --server ';

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

    const pollinginterval = this.platform.config.pollingRate > 10 ? this.platform.config.pollingRate : 10;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const interval = setInterval(() => {
      this.poll();
    }, pollinginterval * 1000);

    //  clearInterval(interval);

    exec(this.serverCommand, (error, stdout, stderr) => {
      if (stderr) {
        this.platform.log.debug('server std error:', stderr.toString());
      }
      if (error) {
        this.platform.log.debug('server error:', error);
      }
    });
  }



  // Percentage to height (easy!)
  // Height = "min" + ("percentage" / 100) * ("max" - "min")
  // height to percentage (a bit more tricky, but solvable)
  // Percentage = (100 * "height") / ("max" - "min") - (100 * "min") / ("max" - "min")

  PercentageToHeight(percentage: number) {
    return Math.round(this.accessory.context.device.baseHeight + (percentage / 100) * (this.accessory.context.device.movementRange));
  }

  HeightToPercentage(height: number) {
    return Math.round( (100 * height) / (this.accessory.context.device.movementRange)
        - (100 * this.accessory.context.device.baseHeight) / this.accessory.context.device.movementRange);
  }

  poll() {
    if (!this.isMoving && !this.isPolling && !this.currentlyRequestingMove) {

      this.isPolling = true;

      const pollcommand = this.baseCommand;

      this.currentPollProcess = exec(pollcommand, (error, stdout, stderr) => {
        if (stderr) {
          this.platform.log.debug('polling std error:', stderr.toString());
        }
        if (error) {
          if (error.signal !== 'SIGINT') {
            this.platform.log.debug('polling error:', error);
          } else {
            // We killed it, lets return.
            return;
          }
        }
        if (stdout) {
          try {
            const outputString = stdout.toString();

            if (outputString === null || outputString === '' || !outputString.includes('Height:')) {
              this.platform.log.debug('polling complete without usable information:', outputString);
              return;
            }

            const splitFirst = outputString.split('Height:')[1];

            const heightStr = splitFirst.split('mm')[0];

            const height_rel: number = this.HeightToPercentage(+heightStr);

            const currentValue = Math.round(height_rel);

            this.platform.log.debug('found height%: ', currentValue);

            //Don't update while moving. Might interrupt movement!
            if (!this.isMoving && !this.currentlyRequestingMove) {
              this.platform.log.debug('Updating polled values!');

              this.currentPos = currentValue;

              this.service.getCharacteristic(this.platform.Characteristic.CurrentPosition).updateValue(this.currentPos);
              this.service.getCharacteristic(this.platform.Characteristic.TargetPosition).updateValue(this.currentPos);
            } else {
              this.platform.log.debug('Not updating polled values because we are moving!');
            }
            return;
          } catch (error) {
            this.platform.log.debug('polling error:', error);
          } finally {
            this.isPolling = false;
          }
        }
      });
    }
  }


  async moveToPercent(percentage: number) {

    if (this.currentMoveRetry > this.maxRetries) {
      return;
    }

    const newheight = this.PercentageToHeight(percentage);

    const moveCommand = this.baseCommand + ' --move-to ' + newheight;

    this.isMoving = true;

    this.currentPollProcess?.kill('SIGINT');
    this.currentPollProcess = null;

    this.currentMoveProcess = exec(moveCommand, (error, stdout, stderr) => {
      if (stderr) {
        this.platform.log.debug('moving std error:', stderr.toString());
      }
      if (error) {
        if (error.signal !== 'SIGINT') {
          this.platform.log.debug('moving error:', error);
          this.currentMoveRetry = this.currentMoveRetry + 1;
          this.moveToPercent(percentage);
        } else {
          // We killed it, lets return.
          return;
        }
      }
      if (stdout) {
        try {
          const outputString = stdout.toString();

          if (outputString === null || outputString === '' || !outputString.includes('Final height:')) {
            this.platform.log.debug('moving complete without usable information:', outputString);
            return;
          }

          const splitFirst = outputString.split('Final height:')[1];

          const heightStr = splitFirst.split('mm')[0];

          const height_rel: number = this.HeightToPercentage(+heightStr);

          const currentValue = height_rel;

          this.platform.log.debug('new height%: ', currentValue);

          this.platform.log.debug('setting new values!');

          this.currentPos = currentValue;

          this.service.getCharacteristic(this.platform.Characteristic.CurrentPosition).updateValue(this.currentPos);
          this.service.getCharacteristic(this.platform.Characteristic.TargetPosition).updateValue(this.currentPos);

        } catch (error) {
          this.platform.log.debug('moving error:', error);
        } finally {
          this.platform.log.debug('resetting move state');
          this.currentMoveRetry = 0;
          this.isMoving = false;
          this.service.getCharacteristic(this.platform.Characteristic.PositionState)
            .updateValue(this.platform.Characteristic.PositionState.STOPPED);
        }
      }
    });
  }


  // HomeKit setter & getters
  // TargetPosition get & set
  // CurrentPosition get
  // PositionState get

  /**
   * Handle requests to set the "Target Position" characteristic
   */
  handleTargetPositionSet(value) {
    this.platform.log.debug('Triggered SET TargetPosition:', value);

    // We don't want any status refreshes until we complete the move.
    this.currentlyRequestingMove = true;

    clearTimeout(this.requestedPosTimer);
    this.requestedPosTimer = setTimeout(() => {

      this.platform.log.debug('executing move to: ', value);

      const moveUp = value > this.currentPos;

      const positionState = moveUp ? this.platform.Characteristic.PositionState.INCREASING
        : this.platform.Characteristic.PositionState.DECREASING;

      // Tell HomeKit we're on the move.
      this.service.getCharacteristic(this.platform.Characteristic.PositionState).updateValue(positionState);

      setTimeout(() => this.moveToPercent(value), 100);

      this.currentlyRequestingMove = false;
    }, 1500);
  }

  /**
   * Handle requests to get the current value of the "Target Position" characteristic
   */
  handleTargetPositionGet() {
    this.platform.log.debug('Triggered GET TargetPosition');
    return this.currentPos;
  }

  /**
   * Handle requests to get the current value of the "Position State" characteristic
   */
  handlePositionStateGet() {
    this.platform.log.debug('Triggered GET PositionState');

    // set this to a valid value for PositionState
    return this.platform.Characteristic.PositionState.STOPPED;
  }

  /**
     * Handle requests to get the current value of the "Current Position" characteristic
     */
  handleCurrentPositionGet() {
    this.platform.log.debug('Triggered GET CurrentPosition');
    setTimeout(() => this.poll(), 100);
    return this.currentPos;
  }
}
