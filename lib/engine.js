
'use strict';

const dc = require('./dockerCompose');
const chalk = require('chalk');
const check = require('./checkCommands')
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
    console.log(chalk.yellow(`\nHawkinit will kill itself and all that Docker jazz in ${timeout} minutes!`));
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

const runOpenshift = (answers, timeout) => {
  console.log(`Answers:\n${chalk.grey(JSON.stringify(answers, null, '  '))}`);
  const status = new Spinner('Running the infrastructure...');
  status.start();

  const options = {
    killSignal: 'SIGTERM',
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    stdio: ['inherit', 'inherit', 'inherit']
  };
  if (timeout) {
    const seconds = timeout * 60;
    console.log(chalk.yellow(`\nHawkinit will kill itself and all that Docker jazz in ${timeout} minutes!`));
    dc.openshiftKill(directory, seconds);
  }

  const urlPrefix = 'https://raw.githubusercontent.com/hawkular/hawkinit/master/lib/configs/openshift';
  const startScript = `${urlPrefix}/startEphemeral.sh`;
  const hServicesTemplate = `${urlPrefix}/hawkular-services-ephemeral.yaml`;
  const parameters = `HAWKULAR_SERVICES_IMAGE=hawkular/hawkular-services:${answers.hawkVersion} TEMPLATE=${hServicesTemplate}`;

  const startServices = `oc cluster down &> /dev/null ; curl -s ${startScript} | ${parameters} sh`;
  // options.stdio = ['inherit', 'inherit', 'inherit'];
  execSync(startServices, options);

  console.log(chalk.grey('Adding the template or WildFly servers with agent installed.'));
  // the image stream doesn't expect the fully qualified image including the tag
  // const hawkflyImg = `pilhuhn/hawkfly:${answers.wfStandaloneVersion}`;
  const hawkflyImg = `pilhuhn/hawkfly`;
  const servicesIP = 'hawkular-services';

  let params;
  if (check.getOpenshiftVersion().major === 1 && check.getOpenshiftVersion().minor < 5) {
    // old syntax
    params = `-v HAWKULAR_SERVER_IP=${servicesIP} HAWKFLY_IMAGE=${hawkflyImg}`;
  } else {
    // new syntax
    params = `--param HAWKULAR_SERVER_IP=${servicesIP} --param HAWKFLY_IMAGE=${hawkflyImg}`;
  }
  const hawkflyTemplate = `${urlPrefix}/hawkfly.yaml`;
  const addHafkfly = `oc process -f ${hawkflyTemplate} ${params} | oc create -f -`;
  execSync(addHafkfly, options);

  if (answers.wfStandaloneCount > 1) {
    console.log(chalk.grey(`Scaling the hawkfly to have ${answers.wfStandaloneCount} replicas.`));
    const scaleCommand = `oc scale --replicas=${answers.wfStandaloneCount} dc hawkfly`;
    execSync(scaleCommand, options);
  }
  console.log(chalk.grey('Deployment has finished, you can shutdown the openshift cluster with `oc cluster down`'));

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
    check.checkOpenshiftIsInstalled(() => {
      try {
        runOpenshift(answers, timeout);
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
