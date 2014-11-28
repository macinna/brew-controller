
var fs = require('fs');
var nconf = require('nconf');
var winston = require('winston');

var mapping = null;
var attachedTemperatureProbes = [];

var configFile = null;


var appLog = winston.loggers.get('application');


module.exports = {
    setConfigFile: function(file) {
        configFile = file;
    },
    getTempProbeMap: function () {
        if( mapping != undefined && mapping != null )
            return mapping;

        if(configFile == null) {
            appLog.error('Conguration file path was not provided.');
            return;
        }

        nconf.use('file', {
            file: configFile
        });
        nconf.load();

        mapping = nconf.get('probeMap');
        if(mapping == undefined) {

            appLog.info('Creating probeMap section in config file (config.json).');
            //we haven't created mapping configurations yet, let's do it now with empty mapping

            mapping = {
                hlt: '',
                mt: '',
                bk: ''
            };

            nconf.set('probeMap:hlt', '');
            nconf.set('probeMap:mt', '');
            nconf.set('probeMap:bk', '');
            nconf.save(function(err) {
                if(err) {
                    appLog.error('Error saving probe mapping data to file.');
                }

            });
        }
        return mapping;
    },
    setTempProbeMap: function (probeMap) {

        if(configFile == null) {
            appLog.error('Conguration file path was not provided.');
            return;
        }

        nconf.use('file', {
            file: configFile
        });
        nconf.load();
        nconf.set('probeMap', probeMap);
        nconf.save(function(err) {
            if (err) {
                appLog.error('Error saving probe mapping data to file.');
            }
            mapping = probeMap;
        });
    },
    getAllAttachedTempProbes: function() {

        if(attachedTemperatureProbes.length > 0)
            return attachedTemperatureProbes;


        //The 1wire file system (owfs) used by this system creates directories for each attached supported probe types.
        //The temperature probes this system supports are the 18S20 and 18B20.  These have a
        //1wire family type ID of 10 and 28 respectively (see http://owfs.sourceforge.net/family.html).
        //The directory names are prefixed with that ID, so we're going to search our 1wire directory
        //for subdirectories with names that start with 10. or 28.

        var files = fs.readdirSync('/mnt/1wire/');
        for( var i = 0; i < files.length; i++ ) {
            var family = files[i].split('.')[0];
            if( family === '10' || family === '28' ){
                attachedTemperatureProbes.push(files[i]);
            }
        }

        return attachedTemperatureProbes;
    },
    getCurrentTemperature: function(probeId, tempCallback) {

        if(mapping == undefined)
            mapping = this.getTempProbeMap();

        var vessel;
        if(mapping.hlt == probeId) {
            vessel = 'hlt';
        }

        if(mapping.mt == probeId) {
            vessel = 'mt';
        }

        if(mapping.bk == probeId) {
            vessel = 'bk';
        }

        var temperatureFile = '/mnt/1wire/' + probeId + '/temperature9';

        fs.readFile(temperatureFile, 'utf8', function(err, data) {
            var degF = data * (9.0/5.0) + 32;
            degF = Math.round(degF * 10) / 10;

            tempCallback(vessel, degF, probeId);

        });

    },
    getCurrentTemperatureSync: function(vessel) {

        if(mapping == null)
            mapping = this.getTempProbeMap();

        var probeId = mapping[vessel];
        var temperatureFile = '/mnt/1wire/' + probeId + '/temperature9';

        var degC = parseFloat(fs.readFileSync(temperatureFile, 'utf8'));
        var degF = degC * (9.0/5.0) + 32;

        degF = Math.round(degF * 10) / 10;

        return degF;

    }


};