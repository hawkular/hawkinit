'use strict';

// modules
const _ = require('lodash');
const chalk = require('chalk');
const check = require('./checkCommands');
const constants = require('./constants');
const CLI = require('clui');
const engine = require('./engine');
const fs = require('fs');
const inquirer = require('inquirer');
const path = require('path');
const RestClient = require('node-rest-client').Client;
const version = require('../package.json').version;

const Spinner = CLI.Spinner;

const show = (save, timeout, full) => {
  const intValidator = maxValue => (value) => {
    const parsed = parseInt(value, 10);
    const valid = !isNaN(parsed) && parsed > 0 && parsed < maxValue;
    return valid || `Please enter a valid integer between 0 and ${maxValue}.`;
  };

  // Based on this: https://gist.github.com/kizbitz/e59f95f7557b4bbb8bf2
  const dockerHubLoadTags = (account, image, defaults) => {
    const client = new RestClient();
    const spinner = new Spinner(`Fetching the image tags for ${image} from hub.docker.com...`);
    spinner.start();
    return new Promise((resolve) => {
      const fetchNext = (current, nextURL) => {
        client.get(nextURL, (data) => {
          for (let i = 0; i < data.results.length; i += 1) {
            current.push(data.results[i].name);
          }
          if (data.next) {
            fetchNext(current, data.next);
          } else {
            spinner.stop();
            resolve(current);
          }
        }).on('error', () => {
          spinner.stop();
          resolve(defaults);
        });
      };
      fetchNext([], `https://hub.docker.com/v2/repositories/${account}/${image}/tags/?page_size=10`);
    });
  };

  const hwkVersions = (framework) => {
    // checking if the oc or docker-compose are installed as a side effect
    if (check.orchestrationFrameworkValidator(framework)) {
      return dockerHubLoadTags('hawkular', 'hawkular-services', constants.HAWKULAR_VERSIONS);
    }
    return [];
  };

  const questions = [
    {
      type: 'list',
      name: 'orchestrationFramework',
      message: 'What conainer orchestration framework do you want to use?',
      default: 'docker-compose',
      choices: ['docker-compose', 'openshift']
    },
    {
      type: 'list',
      name: 'hawkVersion',
      message: 'What version of hawkular services do you want to run?',
      default: constants.HAWKULAR_VERSION_DEFAULT,
      choices: answers => hwkVersions(answers.orchestrationFramework)
    },
    {
      type: 'confirm',
      name: 'ssl',
      message: 'Do you want to use hawkular services over SSL with auto-generated self-signed certificate? ' +
       '(available since 0.35.0)',
      default: false,
      when: () => full
    },
    {
      type: 'confirm',
      name: 'defaultCredentials',
      message: 'Should we pre-create user called \'jdoe\' with password \'password\'? (available since 0.35.0)',
      default: true,
      when: () => full
    },
    {
      type: 'input',
      name: 'hawkularUsername',
      message: 'Provide the username for the account that will be pre-created.',
      default: 'jdoe',
      when: answers => full && !answers.defaultCredentials
    },
    {
      type: 'password',
      name: 'hawkularPassword',
      message: 'Provide the username for the account that will be pre-created.',
      default: 'password',
      when: answers => full && !answers.defaultCredentials
    },
    {
      type: 'list',
      name: 'wfEap',
      message: 'Do you want to run the hawkular-services in WildFly or in EAP?',
      default: 'WildFly',
      choices: ['WildFly', {
        name: 'EAP (not yet implemented)',
        value: 'EAP'
      }],
      when: () => full
    },
    {
      type: 'list',
      name: 'hawkAgent',
      message: 'Should the agent in hawkular services be installed as subsystem, java agent or not at all. ' +
        'Use the Java Agent for h-services 0.35.0 and newer.',
      default: 'javaAgent',
      choices: [{
        name: 'Java agent',
        value: 'javaAgent'
      }, 'Subsystem', 'None (not yet implemented)'],
      when: () => full
    },
    {
      type: 'list',
      name: 'cassandraVersion',
      message: 'What version of cassandra do you want to run?',
      default: constants.CASSANDRA_VERSION_DEFAULT,
      choices: constants.CASSANDRA_VERSIONS,
      when: answers => full && answers.orchestrationFramework === 'docker-compose'
    },
    {
      type: 'input',
      name: 'cassandraCount',
      message: 'How many Cassandra nodes?',
      default: 1,
      validate: intValidator(10),
      filter: Number,
      when: answers => full && answers.orchestrationFramework === 'docker-compose'
    },
    {
      type: 'list',
      name: 'wfType',
      default: ['Standalone'],
      message: 'What kind of WildFly servers do you want to run?',
      choices: ['Standalone', 'Domain', {
        name: 'None (only Hawkular Services itself)',
        value: 'None'
      }],
      when: answers => answers.orchestrationFramework === 'docker-compose'
    },
    {
      type: 'list',
      name: 'hawkflyWfEap',
      message: 'Should the managed server instances be WildFly or EAP?',
      default: 'WildFly',
      choices: ['WildFly', {
        name: 'EAP (not yet implemented)',
        value: 'EAP'
      }],
      when: () => full
    },
    {
      type: 'list',
      name: 'wfStandaloneVersion',
      message: 'What version of instrumented standalone WF (hawkfly) do you want to run?',
      default: constants.HAWKFLY_VERSION_DEFAULT,
      choices: () => dockerHubLoadTags('pilhuhn', 'hawkfly', constants.HAWKFLY_VERSIONS),
      when: answers => answers.wfType === 'Standalone' && answers.hawkAgent === 'Subsystem' &&
        (!answers.hawkflyWfEap || answers.hawkflyWfEap === 'WildFly')
    },
    {
      type: 'list',
      name: 'wfStandaloneVersion',
      message: 'What version of instrumented standalone WF (wildfly-hawkular-javaagent) do you want to run?',
      default: constants.HAWKFLY_NEW_VERSION_DEFAULT,
      choices: () => dockerHubLoadTags('hawkular', 'wildfly-hawkular-javaagent', constants.HAWKFLY_NEW_VERSIONS),
      when: answers => answers.wfType === 'Standalone' && (!answers.hawkAgent || answers.hawkAgent === 'javaAgent') &&
        (!answers.hawkflyWfEap || answers.hawkflyWfEap === 'WildFly')
    },
    {
      type: 'list',
      name: 'eapStandaloneVersion',
      message: 'What version of standalone EAP (eapfly) do you want to run?',
      default: 'latest',
      choices: ['latest'],
      when: answers => answers.wfType === 'Standalone' && answers.hawkflyWfEap === 'EAP'
    },
    {
      type: 'confirm',
      name: 'wildflyImmutableAgent',
      message: 'Do you want your standalone WF (wildfly-hawkular-javaagent) to use an immutable agent?',
      default: true,
      when: answers => full && answers.wfType === 'Standalone' &&
        (!answers.hawkAgent || answers.hawkAgent === 'javaAgent')
    },
    {
      type: 'input',
      name: 'wfStandaloneCount',
      message: 'How many standalone servers do you want to spawn?',
      default: 1,
      validate: intValidator(30),
      filter: Number,
      when: answers => full && (answers.wfType === 'Standalone' || answers.orchestrationFramework === 'openshift')
    },
    {
      type: 'list',
      name: 'wfDomainVersion',
      message: 'What version of domain WF (hawkfly-domain) do you want to run?',
      default: constants.HAWKFLY_VERSION_DEFAULT,
      choices: constants.HAWKFLY_VERSIONS,
      when: answers => answers.wfType === 'Domain'
    },
    {
      type: 'input',
      name: 'hostControllerCount',
      message: 'How many host controllers do you want to have in domain?' +
      ' (1 is always the domain controller and others are host controllers)',
      default: 1,
      validate: intValidator(10),
      filter: Number,
      when: answers => full && answers.wfType === 'Domain'
    },
    {
      type: 'list',
      name: 'domainScenario',
      message: 'What scenario do you want to run? (details: bit.ly/hawkinit)',
      default: constants.DOMAIN_SCENARIO_DEFAULT,
      choices: (answers) => {
        if (answers.hostControllerCount > 1) {
          return _.filter(constants.DOMAIN_SCENARIOS, e => e !== 'default');
        }
        return constants.DOMAIN_SCENARIOS;
      },
      when: answers => full && answers.wfType === 'Domain'
    }
  ];
  return inquirer.prompt(questions).then((answers) => {
    const clone = Object.assign({}, answers);
    clone.hawkinitVersion = version;
    if (save) {
      console.log(chalk.green('Saving the answers to answers.json.'));
      try {
        const cwd = process.cwd();
        fs.writeFileSync(path.join(cwd, 'answers.json'), JSON.stringify(clone, null, '  '));
      } catch (err) {
        console.log(err);
      }
    }
    engine.run(clone, timeout);
  });
};

module.exports = {
  show
};
