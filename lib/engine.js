'use strict';

const dc = require('./dockerCompose');
const chalk = require('chalk');
const checkOpenshiftIsInstalled = require('./checkCommands').checkOpenshiftIsInstalled;
const CLI = require('clui');
const execSync = require('child_process').execSync;
const fs = require('fs');
const mustache = require('mustache');
const path = require('path');
const tmp = require('tmp');

const Spinner = CLI.Spinner;

const runItInternal = (answers, directory, timeout) => {
  if (timeout) {
    const seconds = timeout * 60;
    console.log(chalk.yellow(`\nHawkinit kill itself and all that Docker jazz in ${timeout} minutes!`));
    dc.kill(directory, seconds);
  }
  process.on('exit', () => {
    process.on('exit', () => {
      console.log(chalk.cyan('Stop it! I am not gonna finish, untill I am done.'));
    });
    console.log(chalk.cyan('Removing containers created by docker-compose script.'));
    dc.rm(directory, 0);
  });

  // run additional cassandra nodes if reqested
  if (answers.cassandraCount > 1) {
    // add shutdown hook for C* containers
    process.on('exit', () => {
      console.log(chalk.cyan('Removing Cassandra containers.'));
      dc.cassandraCleanup(answers.cassandraVersion);
    });

    for (let i = 1; i < answers.cassandraCount; i += 1) {
      console.log(chalk.cyan(`Starting Cassandra node ${i}`));
      dc.runCassandra(answers.cassandraVersion, (`0${i}`).slice(-2));
    }
  }
  try {
    if (answers.wfType === 'Standalone') {
      if (answers.wfStandaloneCount > 1) {
        dc.scale(directory, 'hawkfly', answers.wfStandaloneCount);
      }
    } else if (answers.wfType === 'Domain') {
      if (answers.hostControllerCount > 2) {
        const domainScenarioServiceMapping = (domainScenario) => {
          switch (domainScenario) {
            case 'mid-size':
              return 'hawkfly-domain-middle-slave';
            case 'small':
              return 'hawkfly-domain-simple-slave';
            default:
              return `hawkfly-domain-${domainScenario}-slave`;
          }
        };
        dc.scale(directory, domainScenarioServiceMapping(answers.domainScenario), answers.hostControllerCount - 1);
      }
    }
    console.log(chalk.green('\nLater, you can find your hawkular-services listening on ') +
     chalk.green.bold('http://localhost:8080'));
    dc.up(directory);
    process.exit();
  } catch (e) {
    console.log(chalk.blue('\n\nStopping Hawkinit.\n'));
  }
};

const getTheTemplatePath = (answers) => {
  if (answers.wfType === 'Standalone') {
    return '/configs/standalone/hawkfly.mustache';
  }
  // domain
  let fsPath = '/configs/domain/';
  fsPath += (answers.hostControllerCount > 1) ? 'n-hosts/' : '1-host/';
  fsPath += `${answers.domainScenario}/docker-compose.mustache`;
  return fsPath;
};

const runDockerCompose = (answers, timeout) => {
  const status = new Spinner('Running the infrastructure...');
  status.start();
  console.log(`Answers:\n${chalk.grey(JSON.stringify(answers, null, '  '))}`);
  try {
    const templatePath = getTheTemplatePath(answers);
    const template = fs.readFileSync(path.join(__dirname, templatePath), 'utf8');
    const result = mustache.render(template, answers);
    tmp.dir('/tmp/hawkinit-', (err, directory) => {
      if (err) {
        throw err;
      }
      fs.writeFileSync(`${directory}/docker-compose.yaml`, result);
      setTimeout(() => {
        status.stop();
        runItInternal(answers, directory, timeout);
      }, 1000);
    });
  } catch (e) {
    console.log(chalk.red(e));
  }
};

const runOpenshift = (answers) => {
  console.log(`Answers:\n${chalk.grey(JSON.stringify(answers, null, '  '))}`);
  const status = new Spinner('Running the infrastructure...');
  status.start();

  const options = {
    killSignal: 'SIGTERM',
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  };

  const command1 = 'sudo iptables -F';
  console.log(chalk.cyan(`Running \`${command1}\`...` +
                         'If you don\'t trust us, feel free to press CTRL+C and run it on your own.'));
  try {
    execSync(command1, options);
  } catch (e) {
    console.log(chalk.grey('Skipping iptables flush. If the DNS is broken, run it on your own.'));
  }
  const command2 = 'oc cluster down && curl -s https://raw.githubusercontent.com/hawkular/hawkular-services/' +
                   'b46ab2fb67a1c0bcc4b876d50d2cbfc01693eed4/openshift/startEphemeral.sh | sh';
  options.stdio = ['inherit', 'inherit', 'inherit'];
  execSync(command2, options);
  status.stop();
};

const run = (answers, timeout) => {
  if (answers.orchestrationFramework === 'docker-compose' || answers.orchestrationFramework === undefined) {
    try {
      runDockerCompose(answers, timeout);
    } catch (e) {
      console.log(chalk.red(`Error when trying to use the docker-compose infrastructure: ${e}`));
    }
  } else if (answers.orchestrationFramework === 'openshift') {
    checkOpenshiftIsInstalled(() => {
      try {
        runOpenshift(answers);
      } catch (e) {
        console.log(chalk.red(`Error when trying to use the openshift infrastructure: ${e}`));
      }
    });
  } else {
    console.log(chalk.red(`Orchestration framework ['${answers.orchestrationFramework}'] is not supported`));
    process.exit();
  }
};

module.exports = {
  run
};
