var express = require('express');
var app = express();
var winston = require('winston');
var nconf = require('nconf');
var pid = require('./pid-controller');
var exec = require('child_process').exec;

var PIDsettings = {};
var root = __dirname + '/public';

const   DUTY_CYCLE = 60000,  //Duty cycle for PWM in ms
        CONFIG_FILE = __dirname + '/config.json';



var clientTimer = -1;
var timerHandle;

//
// Configure the loggers
//
winston.loggers.add('application', {
    console: {
        level: 'silly',
        colorize: 'true'
    },
    file: {
        filename: __dirname + '/logs/application.log',
        json: false
    }
});

// Configure the logger for data
winston.loggers.add('data', {
    file: {
        filename: __dirname + '/logs/data.log',
        json: false
    }
});

var appLog = winston.loggers.get('application');
var dataLog = winston.loggers.get('data');

var pi = require(__dirname + '/pi-helper');
var probes = require(__dirname + '/temperature-helper');

probes.setConfigFile(CONFIG_FILE);

appLog.info('Starting up...');


nconf.use('file', {
    file: CONFIG_FILE
});
nconf.load();

PIDsettings = {
    Kp: nconf.get('PID:Kp') || 25,
    Ki: nconf.get('PID:Ki') || 1000,
    Kd: nconf.get('PID:Kd') || 9
};

app.use(express.static(__dirname + '/public'));
app.use('/logs', express.static(__dirname + '/logs'));

app.get('*', function(req, res) {
    var options = { root: root };
    res.sendFile('html/index.html', options);
});

var server = app.listen(process.argv[2] || 3000, function() {
    console.log('Listening on port %d', server.address().port);
});


var io = require('socket.io')(server);

var currentStates = {
    hltBurner: 'off',
    mtBurner: 'off',
    leftPump: 'off',
    rightPump: 'off',
    regulateHlt: 'off',
    regulateMt: 'off',
    hltSetPoint: '',
    mtSetPoint: '',
    timer: 'off'
};

var hltPidController = new pid.PIDController(50, PIDsettings.Kp, PIDsettings.Ki, PIDsettings.Kd, pid.direction.FORWARD, DUTY_CYCLE);
var mtPidController = new pid.PIDController(50, PIDsettings.Kp, PIDsettings.Ki, PIDsettings.Kd, pid.direction.FORWARD, DUTY_CYCLE);


hltPidController.setOutputLimits(0, DUTY_CYCLE);
mtPidController.setOutputLimits(0, DUTY_CYCLE);

var init = false;

process.on('SIGINT', function () {
    console.log('exiting...');

    server.close(function () {
        process.exit(0);
    });
});

io.on('connection', function (socket) {

    //Send current states to the client to set up the UI
    socket.emit('update_toggles', currentStates );

    //Update the temperatures immediately, then set up the interval only once.
    //Otherwise any additional connections will kick off more.
    updateTemperatures();
    if(init == false) {
        setInterval(updateTemperatures, 5000);
        init = true;
    }

    //Event handler for regulating the temperature of a vessel
    socket.on('regulate-temp-clicked', function(data) {

        appLog.info('%s,%s,%s', 'regulate-temp-clicked', data.vessel, data.newState);
        dataLog.info('Kp: %s, Ki: %s, Kd: %s', PIDsettings.Kp, PIDsettings.Ki, PIDsettings.Kd);

        //start regulating the temp
        if(data.newState == 'on') {
            if (data.vessel == 'hlt') {
                currentStates.regulateHlt = data.newState;
                currentStates.hltSetPoint = data.setPoint;
                hltPidController.updateSetPoint(data.setPoint);
                hltPidController.setMode(pid.mode.AUTOMATIC, probes.getCurrentTemperatureSync('hlt'));
                regulateTemperature(data.vessel, hltPidController);
            }
            else {
                currentStates.regulateMt = data.newState;
                currentStates.mtSetPoint = data.setPoint;
                mtPidController.updateSetPoint(data.setPoint);
                mtPidController.setMode(pid.mode.AUTOMATIC, probes.getCurrentTemperatureSync('mt'));
                regulateTemperature(data.vessel, mtPidController);
            }
        } else {
            //update states and turn off the appropriate burner and set pid controller to off (manual)
            if (data.vessel == 'hlt') {
                currentStates.regulateHlt = data.newState;
                hltPidController.setMode(pid.mode.MANUAL);
            } else {
                currentStates.regulateMt = data.newState;
                mtPidController.setMode(pid.mode.MANUAL);
            }
            pi.setBurnerState(data.vessel, data.newState);
        }
        refreshUI(socket);
    });
    
    //Event handler for toggling a burner 
    socket.on('toggle-burner-clicked', function(data) {
        appLog.info('%s,%s,%s', 'toggle-burner-clicked', data.burner, data.newState);

        data.burner == 'hlt' ? currentStates.hltBurner = data.newState : currentStates.mtBurner = data.newState;
        pi.setBurnerState(data.burner, data.newState);
        refreshUI(socket);
    });
    
    //Event handler for toggling a pump 
    socket.on('toggle-pump-clicked', function(data) {

        appLog.info('%s,%s,%s', 'toggle-pump-clicked', data.pump, data.newState);
        data.pump == 'left' ? currentStates.leftPump = data.newState : currentStates.rightPump = data.newState;
        pi.setPumpState(data.pump, data.newState);
        refreshUI(socket);
    });

    socket.on('timer-clicked', function(data) {

        appLog.info('%s,%s,%s', 'timer-clicked', data.seconds, data.newState);
        if(data.newState == 'on') {
            currentStates.timer = 'on';
            clientTimer = data.seconds;

            updateTimer(socket);
            timerHandle = setInterval(function () {
                clientTimer--;
                updateTimer(socket);
            }, 1000);
        } else {
            currentStates.timer = 'off';
            clearInterval(timerHandle);
        }
        refreshUI(socket);  //updates state on clients
    });

    //Get configuration data
    socket.on('get-configuration-data', function(data) {
        appLog.info('%s', 'get-configuration-data');
        var cfgData = {
            probeData: {
                allAttachedProbes: probes.getAllAttachedTempProbes(),
                probeMap: probes.getTempProbeMap()
            },
            PID: {
                Kp: PIDsettings.Kp,
                Ki: PIDsettings.Ki,
                Kd: PIDsettings.Kd
            }
        };

        //Send array of all the temp probes to the client
        socket.emit('configuration-data', cfgData);

    });


    socket.on('save-config-data', function(data) {
        appLog.info('%s,%s,%s', 'save-config-data', data.PID, data.selectedTempProbes);

        probes.setTempProbeMap(data.selectedTempProbes);

        nconf.set('PID:Kp', data.PID.Kp);
        nconf.set('PID:Ki', data.PID.Ki);
        nconf.set('PID:Kd', data.PID.Kd);
        nconf.save( function(error) {
            if(error) {
                console.error(error.message);
                socket.emit('save-configuration-status', {
                        status: 'error'
                    }
                );
                return;
            }

            PIDsettings.Kp = data.PID.Kp;
            PIDsettings.Ki = data.PID.Ki;
            PIDsettings.Kd = data.PID.Kd;

            hltPidController.setTunings(PIDsettings.Kp, PIDsettings.Ki, PIDsettings.Kd);
            mtPidController.setTunings(PIDsettings.Kp, PIDsettings.Ki, PIDsettings.Kd);

            socket.emit('save-configuration-status', {
                    status: 'success'
                }
            );
        });
    });

    socket.on('shut-down', function(data) {
        appLog.info('%s', 'shut-down');

        exec('shutdown -h -P now', function (error, stdout, stderr) {
            if(error) {
                console.log(error.message);
            }
        });

    });


});


function updateTimer(socket) {
    io.sockets.emit('update_timer', clientTimer);
}


function refreshUI(socket) {
    socket.broadcast.emit('update_toggles', currentStates);
}

function updateTemperatures() {

    //get all attached temp probes.
    var allProbes = probes.getAllAttachedTempProbes();

    allProbes.forEach(function (probe) {
        probes.getCurrentTemperature(probe, sendTemperature)
    });

}

function sendTemperature(vessel, temp, probeId) {

    io.sockets.emit('temperature', {
        vessel: vessel,
        temperature: temp,
        probeId: probeId
    });

}
 

function regulateTemperature(vessel, pidController) {

    var
        onTime = 0,
        currentTemp = probes.getCurrentTemperatureSync(vessel);

    pidController.compute(currentTemp);
    onTime = pidController.getOutput();
    dataLog.info('%s,%d,%d', vessel, currentTemp, onTime);

    if (onTime == 0) {
        // PID says burner should be off
        pi.setBurnerState(vessel, 'off');

        //schedule re-evaluation in DUTY_CYLE time
        setTimeout(function () {
            regulateTemperature(vessel, pidController);
        }, DUTY_CYCLE);
    } else {

        //turn the burner on for the specified amount of time, if it's going to be on for more than 1/2s

        if(onTime > 500) {
            pi.setBurnerState(vessel, 'on');
        }

        //schedule the burner to be turned off in onTime milliseconds
        setTimeout(function () {

            //turn off if it will be off for longer than 500 ms
            if(onTime < DUTY_CYCLE - 500) {
                pi.setBurnerState(vessel, 'off');
            }

            var state = (vessel == 'hlt' ? currentStates.regulateHlt : currentStates.regulateMt);
            if (state == 'on') {
                // schedule the next evalutaion after the burner has been off for the specified duration (i.e. on + off = DUTY_CYLE)
                setTimeout(function () {
                    regulateTemperature(vessel, pidController);
                }, DUTY_CYCLE - onTime);
            }
        }, onTime);
    }
}

























