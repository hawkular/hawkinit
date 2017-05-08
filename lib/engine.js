'use strict';

const dc = require('./dockerCompose');
const chalk = require('chalk');
const check = require('./checkCommands');
const CLI = require('clui');
const constants = require('./constants');
const execSync = require('child_process').execSync;
const fs = require('fs');
const jsonTransform = require('./jsonTransform');
const mustache = require('mustache');
const osUtils = require('./osUtils');
const path = require('path');
const tmp = require('tmp');
const yaml = require('js-yaml');

const Spinner = CLI.Spinner;

const sayWhereItIsRunning = (answers) => {
  console.log(chalk.green('\nLater, you can find your hawkular-services listening on ') +
   chalk.green.bold('http://localhost:8080'));
  if (answers.ssl) {
    console.log(chalk.green('\nSSL is enabled, so it\'s listening also on ') +
     chalk.green.bold('https://localhost:8443\n'));
  }
  console.log(chalk.grey('\n   Credentials:\n   ---------------------\n   Username: ') +
   chalk.green(answers.hawkularUsername));
  const greenPass = chalk.green(answers.hawkularPassword);
  console.log(`${chalk.grey('   Password: ')}${greenPass}\n\n`);
};

const updateWfAgentConfiguration = (updateSteps, directory, containers) => {
  for (let i = 0; i < containers.length; i += 1) {
    const container = containers[i];
    const environment = dc.env(container);
    const configurationName = 'hawkular-javaagent-config.yaml';
    const containerConfigPath = `${container}:${environment.JBOSS_HOME}/standalone/configuration/${configurationName}`;
    const localConfigPath = `${directory}/${container}_${configurationName}`;
    dc.cp(containerConfigPath, localConfigPath);
    let config = yaml.safeLoad(fs.readFileSync(localConfigPath));
    config = jsonTransform(config, updateSteps);
    fs.writeFileSync(localConfigPath, yaml.safeDump(config));
    dc.cp(localConfigPath, containerConfigPath);
  }
};

const buildWfAgentConfigurationUpdateSteps = (answers) => {
  const updateSteps = [];
  if (answers.wfType === 'Standalone' && answers.wildflyImmutableAgent === false) {
    updateSteps.push({
      path: ['subsystem', 'immutable'],
      value: 'false'
    });
  }
  return updateSteps;
};

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
    sayWhereItIsRunning(answers);

    dc.create(directory, true);

    const wfAgentConfigurationUpdateSteps = buildWfAgentConfigurationUpdateSteps(answers);

    if (wfAgentConfigurationUpdateSteps.length > 0) {
      dc.stop(directory);
      const wfContainerIds = dc.ps(directory, 'hawkfly');
      updateWfAgentConfiguration(wfAgentConfigurationUpdateSteps, directory, wfContainerIds);
    }

    // finally run it!
    dc.up(directory);

    process.exit();
  } catch (e) {
    console.log(chalk.blue('\nStopping Hawkinit.\n'));
    console.log(chalk.blue('If the containers didn\'t stop properly, consider running docker kill `docker ps -qa`\n'));
  }
};

const getTheTemplatePath = (answers) => {
  if (answers.wfType === 'Standalone') {
    return `/configs/standalone/hawkfly-${answers.hawkAgent === 'javaAgent' ? 'new' : 'old'}.mustache`;
  } else if (answers.wfType === 'Domain') {
    // domain
    let fsPath = '/configs/domain/';
    fsPath += (answers.hostControllerCount > 1) ? 'n-hosts/' : '1-host/';
    fsPath += `${answers.domainScenario}/docker-compose.mustache`;
    return fsPath;
  } else if (answers.wfType === 'None') {
    return '/configs/standalone/hservices.mustache';
  }
  return '';
};

const printAnswersAndReturnThem = (answers) => {
  const clone = Object.assign({}, answers);
  let json;
  if (!clone.defaultCredentials) {
    const origPassword = clone.hawkularPassword;
    clone.hawkularPassword = clone.hawkularPassword.replace(/./g, '*');
    json = JSON.stringify(clone, null, '  ');
    clone.hawkularPassword = origPassword;
  } else {
    json = JSON.stringify(clone, null, '  ');
  }
  console.log(`Answers:\n${chalk.grey(json)}`);
  return clone;
};

const runDockerCompose = (answers, timeout) => {
  const status = new Spinner('Running the infrastructure...');
  status.start();

  const clone = printAnswersAndReturnThem(answers);
  try {
    const templatePath = getTheTemplatePath(clone);
    const template = fs.readFileSync(path.join(__dirname, templatePath), 'utf8');

    if (clone.defaultCredentials) {
      clone.hawkularUsername = 'jdoe';
      clone.hawkularPassword = 'password';
    }
    const result = mustache.render(template, clone);
    tmp.dir('/tmp/hawkinit-', (err, directory) => {
      if (err) {
        throw err;
      }
      osUtils.prepareVolumeDirs();
      fs.writeFileSync(`${directory}/docker-compose.yml`, result);
      setTimeout(() => {
        status.stop();
        runItInternal(clone, directory, timeout);
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
    dc.openshiftKill(seconds);
  }

  const urlPrefix = 'https://raw.githubusercontent.com/hawkular/hawkinit/master/lib/configs/openshift';
  const startScript = `${urlPrefix}/startEphemeral.sh`;
  const hServicesTemplate = `${urlPrefix}/hawkular-services-ephemeral.yaml`;
  const parameters = `HAWKULAR_SERVICES_IMAGE=hawkular/hawkular-services:${answers.hawkVersion}` +
    ` TEMPLATE=${hServicesTemplate}`;

  const startServices = `oc cluster down &> /dev/null ; curl -s ${startScript} | ${parameters} sh`;
  execSync(startServices, options);

  console.log(chalk.grey('Adding the template with WildFly servers with agent installed.'));
  // the image stream doesn't expect the fully qualified image including the tag
  // const hawkflyImg = `pilhuhn/hawkfly:${answers.wfStandaloneVersion}`;
  const hawkflyImg = 'pilhuhn/hawkfly';
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
  console.log(chalk.grey('Deployment has finished, you can shutdown the openshift cluster with `oc cluster down`\n'));

  status.stop();
};

// it fills the default values if missing
const postProcessAnswers = (answers) => {
  const clone = Object.assign({}, answers);
  if (clone.wfType === 'Domain' && clone.hostControllerCount === undefined) {
    clone.hostControllerCount = 1;
  }
  if (clone.wfType === 'Domain' && clone.domainScenario === undefined) {
    clone.domainScenario = 'simple';
  }
  if (clone.hawkflyWfEap === undefined) {
    clone.hawkflyWfEap = 'WildFly';
  }
  if (clone.cassandraCount === undefined) {
    clone.cassandraCount = 1;
  }
  if (clone.cassandraVersion === undefined) {
    clone.cassandraVersion = constants.CASSANDRA_VERSION_DEFAULT;
  }
  if (clone.hawkAgent === undefined) {
    clone.hawkAgent = 'javaAgent';
  }
  if (clone.wfEap === undefined) {
    clone.wfEap = 'WildFly';
  }
  if (clone.ssl === undefined) {
    clone.ssl = false;
  }
  if (clone.defaultCredentials === undefined) {
    clone.defaultCredentials = true;
  }
  if (clone.wildflyImmutableAgent === undefined) {
    clone.wildflyImmutableAgent = true;
  }

  // sort by keys
  const ordered = {};
  Object.keys(clone).sort().forEach((key) => {
    ordered[key] = clone[key];
  });
  return ordered;
};

const run = (originalAnswers, timeout) => {
  const answers = postProcessAnswers(originalAnswers);
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
    process.exit(1);
  }
};

module.exports = {
  run
};
