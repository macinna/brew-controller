var os = require('os');
var wpi;

if(os.arch() === 'arm') {
    //running on the pi.  use the actual pins
    wpi = require('./wiring-pi');
} else {
    //running on something else.  use stub.
    wpi = require('./wiring-pi-stub');
}

wpi.wiringPiSetupGpio();

const ON = wpi.LOW;
const OFF = wpi.HIGH;

//gpio pins
const HLT_BURNER_PIN = 23;
const MT_BURNER_PIN =17;
const LEFT_PUMP_PIN = 27;
const RIGHT_PUMP_PIN = 22;

wpi.digitalWrite(HLT_BURNER_PIN, wpi.HIGH);
wpi.digitalWrite(MT_BURNER_PIN, wpi.HIGH);
wpi.digitalWrite(LEFT_PUMP_PIN, wpi.HIGH);
wpi.digitalWrite(RIGHT_PUMP_PIN, wpi.HIGH);

wpi.pinMode(HLT_BURNER_PIN, wpi.OUTPUT);
wpi.pinMode(MT_BURNER_PIN, wpi.OUTPUT);
wpi.pinMode(LEFT_PUMP_PIN, wpi.OUTPUT);
wpi.pinMode(RIGHT_PUMP_PIN, wpi.OUTPUT);


var currentStates = {
    hltBurner: 'off',
    mtBurner: 'off',
    leftPump: 'off',
    rightPump: 'off',
    regulateHlt: 'off',
    regulateMt: 'off'
};


module.exports = {
    setBurnerState: function (burner, state) {
      
        var newPinState = state == 'on' ? ON : OFF;
        var pin;
        
        if(burner == 'hlt') {
            pin = HLT_BURNER_PIN;
            currentStates.hltBurner = state;
        }

        if (burner == 'mt') {
            pin = MT_BURNER_PIN;
            currentStates.mtBurner = state;
        }

        wpi.digitalWrite(pin, newPinState);

    },
    getBurnerState: function(burner) {
        if(burner == 'hlt')
            return currentStates.hltBurner;
        
        if(burner == 'mt')
            return currentStates.mtBurner;
      
    },
    setPumpState: function (pump, state) {
        var newPinState = state == 'on' ? ON : OFF;
        var pin;
        
        if(pump == 'left') {
            pin = LEFT_PUMP_PIN;
            currentStates.leftPump = state;
        }

        if (pump == 'right') {
            pin = RIGHT_PUMP_PIN;
            currentStates.rightPump = state;
        }

        wpi.digitalWrite(pin, newPinState);
    },
    getPumpState: function(pump) {
        if(pump == 'left')
            return currentStates.leftPump;
        
        if(pump == 'right')
            return currentStates.rightPump;
    }
};

function getPinStatus(pin) {
    
}

function setPinStatus(pin, status) {
    
}

