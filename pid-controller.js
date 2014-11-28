


/*Constructor (...)*********************************************************
*    The parameters specified here are those for for which we can't set up
*    reliable defaults, so we need to have the user set them.
***************************************************************************/
var PIDController = function (setPoint, Kp, Ki, Kd, controllerDirection, sampleTime)
{

    Kp = parseFloat(Kp);
    Ki = parseFloat(Ki);
    Kd = parseFloat(Kd);

    this.setPoint = parseFloat(setPoint);
    this.inAuto = false;
    this.sampleTime = parseFloat(sampleTime);							//default Controller Sample Time is 0.1 seconds
    this.output = 0;
    this.ITerm = 0;

    this.setOutputLimits(0, 255);				//default output limit corresponds to
    this.setControllerDirection(controllerDirection);
    this.setTunings(Kp, Ki, Kd);

    this.lastTime = Date.now() - this.sampleTime;

};

PIDController.prototype.compute = function(input) {
    input = parseFloat(input);

    if(!this.inAuto)
        return false;


    var now = Date.now();
    var timeChange = (now - this.lastTime);
    if(timeChange >= this.sampleTime)
    {
         /*Compute all the working error variables*/
        var error = this.setPoint - input;
        this.ITerm += (this.ki * error);
        if(this.ITerm > this.outMax) {
            this.ITerm = this.outMax;
        } else if (this.ITerm < this.outMin) {
            this.ITerm = this.outMin;
        }

        var dInput = input - this.lastInput;

        /*Compute PID Output*/
        var output = this.kp * error + this.ITerm - this.kd * dInput;

        if(output > this.outMax) {
            output = this.outMax;
        } else if(output < this.outMin) {
            output = this.outMin;
        }
        this.output = output;

        /*Remember some variables for next time*/
        this.lastInput = input;
        this.lastTime = now;
        return true;
    } else {
        return false;
    }

};


PIDController.prototype.updateSetPoint = function(newSetPoint) {
    this.setPoint = parseFloat(newSetPoint);
};

PIDController.prototype.setTunings = function(Kp, Ki, Kd) {
    if (Kp < 0 || Ki < 0 || Kd < 0)
        return;

    this.dispKp = Kp;
    this.dispKi = Ki;
    this.dispKd = Kd;

    var sampleTimeInSec = this.sampleTime / 1000;
    this.kp = Kp;
    this.ki = Ki * sampleTimeInSec;
    this.kd = Kd / sampleTimeInSec;

    if(this.controllerDirection == direction.REVERSE)
    {
        this.kp = (0 - this.kp);
        this.ki = (0 - this.ki);
        this.kd = (0 - this.kd);
    }

};



/* SetSampleTime(...) *********************************************************
 * sets the period, in Milliseconds, at which the calculation is performed	
 ******************************************************************************/
PIDController.prototype.setSampleTime = function(newSampleTime) {
    if (newSampleTime > 0) {
        var ratio  = newSampleTime / this.sampleTime;
        this.ki *= ratio;
        this.kd /= ratio;
        this.sampleTime = newSampleTime;
    }
};

/* SetOutputLimits(...)****************************************************
 *     This function will be used far more often than SetInputLimits.  while
 *  the input to the controller will generally be in the 0-1023 range (which is
 *  the default already,)  the output will be a little different.  maybe they'll
 *  be doing a time window and will need 0-8000 or something.  or maybe they'll
 *  want to clamp it from 0-125.  who knows.  at any rate, that can all be done
 *  here.
 **************************************************************************/
PIDController.prototype.setOutputLimits = function(min, max) {

    min = parseFloat(min);
    max = parseFloat(max);

    if (min >= max)
        return;

    this.outMin = min;
    this.outMax = max;

    if(this.inAuto) {
        if(this.output > this.outMax) {
            this.output = this.outMax;
        } else if(this.output < this.outMin) {
            this.output = this.outMin;
        }

        if(this.ITerm > this.outMax) {
            this.ITerm = this.outMax;
        } else if(this.ITerm < this.outMin) {
            this.ITerm = this.outMin;
        }
    }
};

/* SetMode(...)****************************************************************
 * Allows the controller Mode to be set to manual (0) or Automatic (non-zero)
 * when the transition from manual to auto occurs, the controller is
 * automatically initialized
 ******************************************************************************/
PIDController.prototype.setMode = function(newMode, input) {
    var newAuto = (newMode == mode.AUTOMATIC);
    if(newAuto == !this.inAuto) {
        /*we just went from manual to auto*/
        this.initialize(input);
    }
    this.inAuto = newAuto;
};

/* Initialize()****************************************************************
 *	does all the things that need to happen to ensure a bumpless transfer
 *  from manual to automatic mode.
 ******************************************************************************/
PIDController.prototype.initialize = function (input) {
    this.ITerm = this.output;
    this.lastInput = input;
    if(this.ITerm > this.outMax) {
        this.ITerm = this.outMax;
    } else if (this.ITerm < this.outMin) {
        this.ITerm = this.outMin;
    }
};

/* SetControllerDirection(...)*************************************************
 * The PID will either be connected to a DIRECT acting process (+Output leads 
 * to +Input) or a REVERSE acting process(+Output leads to -Input.)  we need to
 * know which one, because otherwise we may increase the output when we should
 * be decreasing.  This is called from the constructor.
 ******************************************************************************/
PIDController.prototype.setControllerDirection = function (direction) {
    if(this.inAuto && direction != this.controllerDirection)
    {
        this.kp = (0 - this.kp);
        this.ki = (0 - this.ki);
        this.kd = (0 - this.kd);
    }

    this.controllerDirection = direction;
};

/* Status Funcions*************************************************************
 * Just because you set the Kp=-1 doesn't mean it actually happened.  these
 * functions query the internal state of the PID.  they're here for display 
 * purposes.  this are the functions the PID Front-end uses for example
 ******************************************************************************/
PIDController.prototype.getKp = function () {
    return  this.dispKp;
};

PIDController.prototype.getKi = function () {
    return  this.dispKi;
};

PIDController.prototype.getKd = function () {
    return  this.dispKd;
};

PIDController.prototype.getMode = function () {
    return  this.inAuto ? mode.AUTOMATIC : mode.MANUAL;
};

PIDController.prototype.getDirection = function () {
    return this.controllerDirection;
};

PIDController.prototype.getOutput = function () {
    if(isNaN(this.output))
        return 0;

    return this.output;
};

var direction = Object.freeze({
    FORWARD: 'forward',
    REVERSE: 'reverse'
});

var mode = Object.freeze({
    AUTOMATIC: 'auto',
    MANUAL: 'manual'
});

module.exports = {
    PIDController: PIDController,
    direction: direction,
    mode: mode
};
