'use strict';

var chalk = require('chalk');
var exec = require('child_process').exec;
var commandExists = require('command-exists');

var checkDockerVersion = function(callback) {
  var cmd = "docker --version | cut -f3 -d' '";
  var minX = 1;
  var minY = 12;
  var child = exec(cmd);
  // expected output: Docker version 1.12.2, build bb80604
  // after cut: '1.12.2,'
  child.stdout.on('data', (data) => {
    try {
      var version = data.slice(0,-1);
      var versArray = version.split('.');
      var major = parseInt(versArray[0]);
      var minor = parseInt(versArray[1]);
      var micro = parseInt(versArray[2]);
      if (major >= minX && minor >= minY) {
        callback();
      } else {
        console.log(chalk.red(`Please upgrade the version of Docker. We need version higher than ${minX}.${minY}.*.`));
      }
    } catch (e) {
      console.log(chalk.red(e + ' occured when parsing this output: ' + data + ' after calling ' + cmd));
    }
  });
};

var checkDockerIsInstalled = function(callback){
  commandExists('docker', function(err, dockerEsixts) {
    if(!dockerEsixts) {
      console.log(chalk.red('Command docker is not present on this machine.'));
    }
    commandExists('docker-compose', function(err, dockerComposeExists) {
      if(dockerComposeExists) {
        if (dockerEsixts) {
          checkDockerVersion(function() {
            callback();
          });
        }
      } else {
        console.log(chalk.red('Command docker-compose is not present on this machine.'));
      }
    });
  });
};


module.exports = {
  checkDockerIsInstalled: checkDockerIsInstalled
};
