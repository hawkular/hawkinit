const chalk = require('chalk');
const exec = require('child_process').exec;
const commandExists = require('command-exists');

const checkDockerVersion = (callback) => {
  const cmd = "docker --version | cut -f3 -d' '";
  const minX = 1;
  const minY = 12;
  const child = exec(cmd);
  // expected output: Docker version 1.12.2, build bb80604
  // after cut: '1.12.2,'
  child.stdout.on('data', (data) => {
    try {
      const version = data.slice(0, -1);
      const versArray = version.split('.');
      const major = parseInt(versArray[0], 10);
      const minor = parseInt(versArray[1], 10);
      // const micro = parseInt(versArray[2], 10);
      if (major >= minX && minor >= minY) {
        callback();
      } else {
        console.log(chalk.red(`Please upgrade the version of Docker. We need version higher than ${minX}.${minY}.*.`));
      }
    } catch (e) {
      console.log(chalk.red(`${e} occured when parsing this output: ${data} after calling ${cmd}`));
    }
  });
};

const checkDockerDeamonRunning = (callback) => {
  const cmd = 'docker ps';
  const child = exec(cmd);
  child.on('exit', (code) => {
    if (code !== 0) {
      console.log(chalk.red('Unable to contact the docker deamon. ' +
      'Make sure it\'s running and that your user is in the docker group.'));
    } else {
      callback();
    }
  });
};

const checkDockerIsInstalled = (callback) => {
  commandExists('docker', (err, dockerEsixts) => {
    if (!dockerEsixts) {
      console.log(chalk.red('Command docker is not present on this machine.'));
    }
    commandExists('docker-compose', (err2, dockerComposeExists) => {
      if (dockerComposeExists) {
        if (dockerEsixts) {
          checkDockerVersion(() => checkDockerDeamonRunning(() => callback()));
        }
      } else {
        console.log(chalk.red('Command docker-compose is not present on this machine.'));
      }
    });
  });
};


module.exports = {
  checkDockerIsInstalled
};
