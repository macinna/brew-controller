google.load("visualization", "1", {packages:["gauge", "corechart"]});
google.setOnLoadCallback(initCharts);


var socket = io.connect('/');


var gaugeOptions = {
    width: 400, height: 120,
    redFrom: 180, redTo: 225,
    minorTicks: 5,
    width:200,
    height:200,
    max:225
};


var hltGauge, mtGauge, bkGauge;
var hltGaugeData, mtGaugeData, bkGaugeData;

function initCharts() {

    //draw initial guages
    hltGaugeData = google.visualization.arrayToDataTable([
        ['Label', 'Value'],
        ['HLT', 0]
    ]);


    mtGaugeData = google.visualization.arrayToDataTable([
        ['Label', 'Value'],
        ['MT', 0]
    ]);

    bkGaugeData = google.visualization.arrayToDataTable([
        ['Label', 'Value'],
        ['BK', 0]
    ]);

    hltGauge = new google.visualization.Gauge(document.getElementById('hlt_gauge_div'));
    hltGauge.draw(hltGaugeData, gaugeOptions);
    
    mtGauge = new google.visualization.Gauge(document.getElementById('mt_gauge_div'));
    mtGauge.draw(mtGaugeData, gaugeOptions);

    bkGauge = new google.visualization.Gauge(document.getElementById('bk_gauge_div'));
    bkGauge.draw(bkGaugeData, gaugeOptions);

}


//Initialize current button states
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


/* 
    Button Event Handlers
*/
$('#hlt_regulate_toggle').click( function() {

    //validate that a set point was provided
    if ($.isNumeric( $('#hlt_set_point').val())) {
        $('#reg_hlt_input_group').toggleClass('has-error', false);
    }
    else {
        $('#reg_hlt_input_group').toggleClass('has-error', true);
        return;
    }

    var newState = currentStates.regulateHlt === 'off' ? 'on' : 'off';
    currentStates.regulateHlt = newState;

    //if we're regulating a temp, the burner cannot be manually controlled, nor can they change the set point value
    $('#hlt_set_point').prop('disabled', newState == 'on');
    $('#reg_hlt_spinner').toggleClass('fa-spin', newState == 'on');

    socket.emit('regulate-temp-clicked', {
            vessel: 'hlt',
            newState: newState,
            setPoint: $('#hlt_set_point').val()
        }
    );
    toggleButtonState(this);
});


$('#mt_regulate_toggle').click( function() {

    //validate that a set point was provided
    if ($.isNumeric( $('#mt_set_point').val())) {
        $('#reg_mt_input_group').toggleClass('has-error', false);
    }
    else {
        $('#reg_mt_input_group').toggleClass('has-error', true);
        return;
    }



    var newState = currentStates.regulateMt === 'off' ? 'on' : 'off';
    currentStates.regulateMt = newState;

    //if we're regulating a temp, the burner cannot be manually controlled, nor can they change the set point value
    $('#mt_set_point').prop('disabled', newState == 'on');
    $('#reg_mt_spinner').toggleClass('fa-spin', newState == 'on');

    socket.emit('regulate-temp-clicked', {
            vessel: 'mt',
            newState: newState,
            setPoint: $('#mt_set_point').val()
        }
    );
    toggleButtonState(this);
});


$('#hlt_burner_toggle').click( function() {
    var newState = currentStates.hltBurner === 'off' ? 'on' : 'off';
    currentStates.hltBurner = newState;

    $('#burner_hlt_spinner').toggleClass('fa-spin', newState == 'on');

    socket.emit('toggle-burner-clicked', {
            burner: 'hlt',
            newState: newState
        }
    );
    toggleButtonState(this);
});



$('#mt_burner_toggle').click( function() {
    var newState = currentStates.mtBurner === 'off' ? 'on' : 'off';
    currentStates.mtBurner = newState;

    $('#burner_mt_spinner').toggleClass('fa-spin', newState == 'on');

    socket.emit('toggle-burner-clicked', {
            burner: 'mt',
            newState: newState
        }
    );
    toggleButtonState(this);
});

$('#left_pump_toggle').click( function() {
    var newState = currentStates.leftPump === 'off' ? 'on' : 'off';
    currentStates.leftPump = newState;
    $('#left_pump_spinner').toggleClass('fa-spin', newState == 'on');
    socket.emit('toggle-pump-clicked', {
            pump: 'left',
            newState: newState
        }
    );
    toggleButtonState(this);
});

$('#right_pump_toggle').click( function() {
    var newState = currentStates.rightPump === 'off' ? 'on' : 'off';
    currentStates.rightPump = newState;
    $('#right_pump_spinner').toggleClass('fa-spin', newState == 'on');
    socket.emit('toggle-pump-clicked', {
            pump: 'right',
            newState: newState
        }
    );
    toggleButtonState(this);
});


$('#timer_toggle').click( function() {

    //validate input
    var hrInput = $('#timer_hours').val().trim();
    var minInput = $('#timer_minutes').val().trim();
    var secInput = $('#timer_seconds').val().trim();

    if(isNaN(hrInput) || isNaN(minInput) || isNaN(secInput))
        return;

    hrInput = hrInput.length == 0 ? 0 : parseInt(hrInput);
    minInput = minInput.length == 0 ? 0 : parseInt(minInput);
    secInput = secInput.length == 0 ? 0 : parseInt(secInput);

    var newState = currentStates.timer === 'off' ? 'on' : 'off';
    currentStates.timer = newState;

    var totalSeconds = hrInput * 3600 + minInput * 60 + secInput;

    socket.emit('timer-clicked', {
            seconds: totalSeconds,
            newState: newState
        }
    );
    toggleButtonState(this);
});



$('#shutdown').click(function () {

    $('#shutdown-message').show();
    $('#shutdown-warning').hide();
    $('#shutdown').hide();
    $('#dismiss-shutdown').hide();

    socket.emit('shut-down');
});

$('#configure').click( function() {
        //remove any messages still lingering from previous time
        $('#config-save-success').toggleClass('show', false);
        $('#config-save-success').toggleClass('hidden', true);

        $('#config-save-error').toggleClass('show', false);
        $('#config-save-error').toggleClass('hidden', true);

        $('#validation-not-unique-error').toggleClass('show', false);
        $('#validation-not-unique-error').toggleClass('hidden', true);

    $('#Kp_form_group').toggleClass('has-error', false);
    $('#Ki_form_group').toggleClass('has-error', false);
    $('#Kd_form_group').toggleClass('has-error', false);


    socket.emit('get-configuration-data');
});

$('#save-configuration').click( function() {

    var hltProbeDd = $('#hltTempProbe');
    var mtProbeDd = $('#mtTempProbe');
    var bkProbeDd = $('#bkTempProbe');

    //validate probe selections. they must be unique or blank.
    var showValidationError = false;

    if(hltProbeDd.val() != '') {
        if(hltProbeDd.val() == mtProbeDd.val() || hltProbeDd.val() == bkProbeDd.val() )
            showValidationError = true;
    } else if (mtProbeDd.val() != '') {
        if(mtProbeDd.val() == hltProbeDd.val() || mtProbeDd.val() == bkProbeDd.val() )
            showValidationError = true;
    } else if (bkProbeDd.val() != '') {
        if(bkProbeDd.val() == hltProbeDd.val() || bkProbeDd.val() == mtProbeDd.val() )
            showValidationError = true;
    }

    if( showValidationError) {
        $('#validation-not-unique-error').toggleClass('show hidden');
        return;
    }

    //validate PID settings
    var KpInput = $('#Kp');
    var KiInput = $('#Ki');
    var KdInput = $('#Kd');


    $('#Kp_form_group').toggleClass('has-error', !$.isNumeric(KpInput.val()));
    $('#Ki_form_group').toggleClass('has-error', !$.isNumeric(KiInput.val()));
    $('#Kd_form_group').toggleClass('has-error', !$.isNumeric(KdInput.val()));

    showValidationError = !($.isNumeric(KpInput.val()) && $.isNumeric(KiInput.val()) && $.isNumeric(KdInput.val()) );
    if(showValidationError)
        return;


    var data = {
        selectedTempProbes: {
            hlt: hltProbeDd.val(),
            mt: mtProbeDd.val(),
            bk: bkProbeDd.val()
        },
        PID: {
            Kp: KpInput.val(),
            Ki: KiInput.val(),
            Kd: KdInput.val()
        }
    };

    socket.emit('save-config-data', data);
});


/*
    Socket.io event handlers
 */
socket.on('save-configuration-status', function(data) {
    if(data.status === 'success') {
        $('#config-save-success').toggleClass('hidden show');
    } else {
        $('#config-save-error').toggleClass('hidden show');
    }

});

socket.on('configuration-data', function(data) {
    updateOptionsList(data.probeData, 'hlt', $('#hltTempProbe'));
    updateOptionsList(data.probeData, 'mt', $('#mtTempProbe'));
    updateOptionsList(data.probeData, 'bk', $('#bkTempProbe'));

    $('#Kp').val(data.PID.Kp);
    $('#Ki').val(data.PID.Ki);
    $('#Kd').val(data.PID.Kd);


});


socket.on('update_toggles', function(data) {
    console.log(data);
    
    //Update HLT Burner Toggle state
    if(data.hltBurner != currentStates.hltBurner) {
        $('#burner_hlt_spinner').toggleClass('fa-spin', data.hltBurner == 'on');
        toggleButtonState($('#hlt_burner_toggle'));
    }

    //Update MT Burner Toggle state
    if(data.mtBurner != currentStates.mtBurner) {
        $('#burner_mt_spinner').toggleClass('fa-spin', data.mtBurner == 'on');
        toggleButtonState($('#mt_burner_toggle'));
    }

    //Update HLT Regulator Toggle state
    if(data.regulateHlt != currentStates.regulateHlt) {
        //if we're regulating a temp, the burner cannot be manually controlled, nor can they change the set point value
        $('#hlt_set_point').prop('disabled', data.regulateHlt == 'on');
        $('#reg_hlt_spinner').toggleClass('fa-spin', data.regulateHlt == 'on');
        toggleButtonState($('#hlt_regulate_toggle'));
    }

    //Update MT Regulator Toggle state
    if(data.regulateMt != currentStates.regulateMt) {
        //if we're regulating a temp, the burner cannot be manually controlled, nor can they change the set point value
        $('#mt_set_point').prop('disabled', data.regulateMt == 'on');
        $('#reg_mt_spinner').toggleClass('fa-spin', data.regulateMt == 'on');
        toggleButtonState($('#mt_regulate_toggle'));
    }

    //Update Left Pump Toggle state
    if(data.leftPump != currentStates.leftPump) {
        $('#left_pump_spinner').toggleClass('fa-spin', data.leftPump == 'on');
        toggleButtonState($('#left_pump_toggle'));
    }

    //Update MT Regulator Toggle state
    if(data.rightPump != currentStates.rightPump){
        $('#right_pump_spinner').toggleClass('fa-spin', data.rightPump == 'on');
        toggleButtonState($('#right_pump_toggle'));
    }

    //Update the HLT set point
    if(data.hltSetPoint != currentStates.hltSetPoint)
        $('#hlt_set_point').val(data.hltSetPoint);

    //Update the MT set point
    if(data.mtSetPoint != currentStates.mtSetPoint)
        $('#mt_set_point').val(data.mtSetPoint);

    //Update the timer
    if(data.timer != currentStates.timer)
        toggleButtonState($('#timer_toggle'));

    currentStates = data;
});



socket.on('update_timer', function(data) {
    var totalSeconds = parseInt(data);
    var hours = parseInt(totalSeconds / 3600);
    var minutes = parseInt(totalSeconds % 3600 / 60);
    var seconds = parseInt((totalSeconds % 3600) % 60);

    $('#timer_hours').val(hours);
    $('#timer_minutes').val(minutes);
    $('#timer_seconds').val(seconds);

});


    var probeTemperatures = new Array();

socket.on('temperature', function(temps) {
    console.log(temps);


    //populating our associative array with data that is used in vessel->probe configuration
    probeTemperatures[temps.probeId] = {
        vessel: temps.vessel,
        temperature: temps.temperature
    };


    //if we're here before our gauges have been drawn, or if this is a temp record for an unassociated probe, we exit
    //since there is no UI to update
    if(hltGauge == undefined || temps.vessel == undefined)
        return;

    var gaugeData, gaugeChart;

    if(temps.vessel == 'hlt') {
        gaugeData = hltGaugeData;
        gaugeChart = hltGauge;
    }

    if(temps.vessel == 'mt') {
        gaugeData = mtGaugeData;
        gaugeChart = mtGauge;
    }

    if(temps.vessel == 'bk') {
        gaugeData = bkGaugeData;
        gaugeChart = bkGauge;
    }

    var currentDate = new Date();
    var time = currentDate.getHours() + ':' + (currentDate.getMinutes().length == 1 ? '0' + currentDate.getMinutes() : currentDate.getMinutes()) ;

    gaugeData.setValue(0, 1, temps.temperature);
    gaugeChart.draw(gaugeData, gaugeOptions);

    //if(lineData.getNumberOfRows() > 15){
    //    lineData.removeRow(0);
    //}

});

function updateOptionsList(probeData, vessel, element) {

    element.empty();
    var options = '<option value="">Select a Temperature Probe</option>';
    for( var i = 0; i < probeData.allAttachedProbes.length; i++) {
        var selected = '';
        if(probeData.allAttachedProbes[i] === probeData.probeMap[vessel]) {
            selected = ' selected ';
        }
        options += '<option value="' + probeData.allAttachedProbes[i] + '"' + 'name="' + probeData.allAttachedProbes[i] + '-temp"' + selected + '>' + probeData.allAttachedProbes[i] + '</option>';
        setOptionTemperature(probeData.allAttachedProbes[i]);
    }

    element.append(options);

}


function setOptionTemperature(probeId) {

    var optionElements = document.getElementsByName(probeId + '-temp');
    
    if(optionElements == null || optionElements.length == 0)
        return;

    for(var i = 0; i < optionElements.length; i++) {
        optionElements[i].innerHTML = probeId + '&nbsp;&nbsp;&nbsp;&nbsp;(' + probeTemperatures[probeId].temperature + ' °F)';
    }

    setInterval( function() {
        setOptionTemperature(probeId);
    }, 2000);
}



function toggleButtonState(buttonGroup) {
    $(buttonGroup).find('.btn').toggleClass('active');

    if ($(buttonGroup).find('.btn-primary').size()>0) {
        $(buttonGroup).find('.btn').toggleClass('btn-primary');
    }
    if ($(buttonGroup).find('.btn-danger').size()>0) {
        $(buttonGroup).find('.btn').toggleClass('btn-danger');
    }
    if ($(buttonGroup).find('.btn-success').size()>0) {
        $(buttonGroup).find('.btn').toggleClass('btn-success');
    }
    if ($(buttonGroup).find('.btn-info').size()>0) {
        $(buttonGroup).find('.btn').toggleClass('btn-info');
    }

    $(buttonGroup).find('.btn').toggleClass('btn-default');
}


$(document).ready(function() {

});































