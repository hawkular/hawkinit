'use strict';

const chalk = require('chalk');
const exe = require('child_process').exec;
const commandExists = require('command-exists');
const cmdExistsSync = require('cmd-exists-sync');

let openshiftVersion = 1;

const minDockerEngineVersion = [1, 12];

const checkDockerVersion = (callback) => {
  const cmd = "docker --version | cut -f3 -d' '";
  const minX = minDockerEngineVersion[0];
  const minY = minDockerEngineVersion[1];
  const child = exe(cmd);
  // expected output: Docker version 1.12.2, build bb80604
  // after cut: '1.12.2,'
  child.stdout.on('data', (data) => {
    try {
      const version = data.slice(0, -1).toString();
      const versArray = version.split('.');
      const major = parseInt(versArray[0], 10);
      const minor = parseInt(versArray[1], 10);
      // const micro = parseInt(versArray[2], 10);
      if (major > minX || (major === minX && minor >= minY)) {
        callback();
      } else {
        console.log(chalk.red(`Please upgrade the version of Docker. We need version higher than ${minX}.${minY}.*.`));
        process.exit(4);
      }
    } catch (e) {
      console.log(chalk.red(`${e} occured when parsing this output: ${data} after calling ${cmd}`));
      process.exit(5);
    }
  });
};

const checkDockerDeamonRunning = (callback) => {
  const cmd = 'docker ps';
  const child = exe(cmd);
  child.on('exit', (code) => {
    if (code !== 0) {
      console.log(chalk.red('Unable to contact the docker deamon. ' +
      'Make sure it\'s running and that your user is in the docker group.'));
      process.exit(6);
    } else {
      callback();
    }
  });
};

const noDC = chalk.red('Command docker-compose is not present on this machine. ' +
 'Please follow these instructions: https://docs.docker.com/compose/install/');

const checkDockerIsInstalled = (callback) => {
  commandExists('docker', (err, dockerExists) => {
    if (!dockerExists) {
      console.log(chalk.red('Command docker is not present on this machine.'));
      err && console.trace(err);
      process.exit(7);
    } else {
      checkDockerVersion(() => checkDockerDeamonRunning(callback));
    }
  });
};

const checkDockerComposeIsInstalled = (callback) => {
  commandExists('docker-compose', (err, dockerComposeExists) => {
    if (dockerComposeExists) {
      callback();
    } else {
      console.log(noDC);
      err && console.trace(err);
      process.exit(8);
    }
  });
};

const checkDockerComposeVersion = (callback) => {
  const cmd = "docker-compose --version | cut -f3 -d' '";
  const child = exe(cmd);
  const minMajor = minDockerEngineVersion[0];
  const minMinor = minDockerEngineVersion[1];
  // expected output: docker-compose version 1.13.0, build 1719ceb
  // after cut: '1.13.0,'
  child.stdout.on('data', (data) => {
    try {
      const version = data.slice(0, -1).toString();
      const versArray = version.split('.');
      const major = parseInt(versArray[0], 10);
      const minor = parseInt(versArray[1], 10);
      // const micro = parseInt(versArray[2], 10);
      if (major > minMajor || (major === minMajor && minor >= minMinor)) {
        callback();
      } else {
        console.log(chalk.red('Please upgrade the version of docker-compose.' +
          `We need at least version ${minMajor}.${minMinor}.*. to run with requested options.`));
        console.log(chalk.red('Check https://github.com/docker/compose/releases for more info.'));
        process.exit(4);
      }
    } catch (e) {
      console.log(chalk.red(`${e} occured when parsing this output: ${data} after calling ${cmd}`));
      process.exit(5);
    }
  });
};

const checkOpenshiftVersion = (callback) => {
  const cmd = "oc version | head -1 | cut -f2 -d' '";
  const minX = 1;
  const minY = 3;
  const child = exe(cmd);
  // expected output: v1.5.0-alpha.2+e4b43ee
  let firstLine = true;
  child.stdout.on('data', (data) => {
    if (!firstLine) {
      return;
    }
    firstLine = false;
    try {
      const mask = /^v(\d{1,2})\.(\d{1,2}).*/;
      const version = mask.exec(data);
      if (version.length !== 3) {
        console.log(chalk.red(`Wrong format of oc version: ${data}. Expected format is: oc vXX.YY...`));
        process.exit(4);
      }
      const major = parseInt(version[1], 10);
      const minor = parseInt(version[2], 10);
      if (major > minX || (major === minX && minor >= minY)) {
        child.kill();
        openshiftVersion = { major, minor };
        callback();
      } else {
        console.log(chalk.red(`Please upgrade the version of oc. We need version higher than ${minX}.${minY}.*.`));
        process.exit(4);
      }
    } catch (e) {
      console.log(chalk.red(`${e} occured when parsing this output: ${data} after calling ${cmd}`));
      process.exit(5);
    }
  });
};

const noOc = chalk.red('Command oc is not present on this machine. To install it, please visit ' +
'https://github.com/openshift/origin/releases and download the oc client. Also make sure it\'s on your $PATH.');

const checkOpenshiftIsInstalled = (callback) => {
  commandExists('oc', (err, ocExists) => {
    if (!ocExists) {
      console.log(noOc);
      err && console.trace(err);
      process.exit(9);
    }
    checkOpenshiftVersion(callback);
  });
};

const getOpenshiftVersion = () => openshiftVersion;

const orchestrationFrameworkValidator = (framework) => {
  if (framework === 'docker-compose') {
    const result = cmdExistsSync('docker-compose');
    if (!result) {
      console.log(noDC);
      process.exit(8);
    }
    return result;
  }
  // else openshift
  const result = cmdExistsSync('oc');
  if (!result) {
    console.log(noOc);
    process.exit(9);
  }
  return result;
};

module.exports = {
  checkDockerIsInstalled,
  checkDockerComposeIsInstalled,
  checkDockerComposeVersion,
  checkOpenshiftIsInstalled,
  getOpenshiftVersion,
  orchestrationFrameworkValidator
};
