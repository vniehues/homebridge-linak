<span align="center">
    
![logo](Images/homebridge-linak-small.png?raw=true)
    
</span>
<span align="center">
    
  [![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple?style=for-the-badge&scale=1.38)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)
  [![Downloads](https://img.shields.io/npm/dt/homebridge-linak?style=for-the-badge)](https://www.npmjs.com/package/homebridge-linak)
  [![Version](https://img.shields.io/npm/v/homebridge-linak?style=for-the-badge)](https://www.npmjs.com/package/homebridge-linak)
  [![Donate](https://img.shields.io/badge/Donate-PayPal-blue.svg?style=for-the-badge)](https://paypal.me/vniehues/EUR)
    
</span>

# linak-homebridge
homebridge plugin to control any linak bluetooth desk

## Set up

#### Prerequisites

- Linak controlled standing desk (eg. Ikea Idasen)
- [Homebridge](https://homebridge.io) installation on a device that has bluetooth

#### Install

1. Install the latest version of [idasen-controller](https://github.com/rhyst/idasen-controller) first
2. Make sure the homebridge device is paired to the desk over bluetooth
3. Install this plugin
4. Configure this plugin (see below)



## Configuration

#### platform config
| field name                | parameter            | description                                                                                       | default value                         | 
|---------------------------|----------------------|---------------------------------------------------------------------------------------------------|---------------------------------------|
| Name                      | name                 | the name of the platform in your logs                                                             | Linak Platform                        | 
| Polling timeout           | pollingRate          | time in seconds between polls of the current desk height                                          | 20                                    |
| Path to Idasen-Controller | idasenControllerPath | where to find the installation of [idasen-controller](https://github.com/rhyst/idasen-controller) | /home/pi/.local/bin/idasen-controller |
| Desks                     | desks                | array of desks                                                                                    | -                                     |

#### desk config
| field name        | parameter     | description                                                                  | default value | 
|-------------------|---------------|------------------------------------------------------------------------------|---------------|
| Name              | name          | name of the desk                                                             | Linak Desk    |
| MAC Address       | macAddress    | the MAC Address of your desk                                                 | -             |
| Base height       | baseHeight    | The lowest possible height (mm) of the desk top from the floor. Default 620. | 620           |
| Range of movement | movementRange | How far above base-height the desk can extend (mm). Default 650.             | 650           |

#### sample config
``` 
{
    "name": "Linak Platform",
    "pollingRate": 60,
    "idasenControllerPath": "/home/pi/.local/bin/idasen-controller",
    "desks": [
        {
            "name": "Schreibtisch",
            "macAddress": "e0:02:7b:73:8c:13"
        }
    ],
    "platform": "LinakController"
}
```
![sample configuration](Images/configuration.png?raw=true)


## Features
Ads the standing desk as a controllable blind to the home app. 
You can then adjust the desk height by setting that blind.
Unfortinatly there is nothing like a desk or similar in homekit, so this is currently the best solution to freely adjust the height.

I would recomment to set some home scenes for your standing and sitting height, with your prefered value, e.g.:
Standing: blind 65% open
Sitting: blind 25% open
Using scenes you can adjust your desk using scenes like "Hey Siri, activate sitting".

## How it works
The plugin calculates the height in mm from the value set by homekit and calls the [idasen-controller](https://github.com/rhyst/idasen-controller) implementation with the height in mm.
The calculation is taken from [homebridge_idasen](https://github.com/Pob4acke/homebridge_idasen).
It can also get the actual desk height from the controller. 
The actual height will be calculated using the calculations mentioned before and will be returned to homekit as a percentage.

## References
Special thanks to [idasen-controller](https://github.com/rhyst/idasen-controller) for his hard work! This made my plugin possible in the first place.
Special thanks to [homebridge-homebridge_idasen-cmd](https://github.com/Pob4acke/homebridge_idasen) for giving me the idea to spawn a child_process to control the desks.


