
<p align="center">

<img src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>


# linak-homebridge
homebridge plugin to control any linak bluetooth desk

## Set up

#### Prerequisites

- Linak controlled standing desk (eg. Ikea Idasen)
- [Homebridge](https://homebridge.io) installation on a device that has bluetooth

#### Install

1. Install [idasen-controller](https://github.com/rhyst/idasen-controller) first
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
| field name                | parameter            | description                                                                                       | default value                         | 
|---------------------------|----------------------|---------------------------------------------------------------------------------------------------|---------------------------------------|
| Name                      | name                 | name of the desk                                                                                  | Linak Desk                            |
| Desk MAC Address          | macAddress           | the MAC Address of your desk                                                                      | -                                     |

#### sample config
![sample configuration](Images/configuration.png?raw=true)

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

## Features
Ads the standing desk as a controllable blind to the home app. You can then move that blind up and down and and so the desk will do.
Unfortinatly there is nothing like a desk or similar in homekit, so this might be the best solution to freely adjust the height.

I would recomment to set some home scenes for your standing and sitting height, with your prefered value, e.g.:
Standing: blind 90% open
Sitting: blind 15% open
With that you can even say something like "Move desk to sitting height." to Siri.

## How it works
The plugin calculates the height in mm from the value set by homekit and calls the [idasen-controller](https://github.com/rhyst/idasen-controller) implementation with the height in mm.
The calculation is taken from [homebridge_idasen](https://github.com/Pob4acke/homebridge_idasen).

## References
Special thanks to [idasen-controller](https://github.com/rhyst/idasen-controller) for his hard work! This made my plugin possible in the first place.
Special thanks to [homebridge-homebridge_idasen-cmd](https://github.com/Pob4acke/homebridge_idasen) for giving me the idea to spawn a child_process to control the desks.


