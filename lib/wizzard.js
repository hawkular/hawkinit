'use strict';

// modules
const _ = require('lodash');
const chalk = require('chalk');
const engine = require('./engine');
const fs = require('fs');
const inquirer = require('inquirer');
const path = require('path');

// constants
const HAWKFLY_VERSIONS = ['latest', '0.24.2', '0.24.1'];
const HAWKULAR_VERSIONS = ['latest', 'devel', '0.32.0.Final', '0.31.0.Final', '0.30.0.Final', '0.22.0.Final'];
const CASSANDRA_VERSIONS = ['latest', '3.9', '3.7', '3.5', '3.4', '3.3', '3.2', '3.2.1', '3.1', '3.0.9', '3.0', '2.2',
  '2.1'];
const DOMAIN_SCENARIOS = ['default', 'simple', 'mid-size', 'ha', 'mixed'];

const show = (save, timeout) => {
  const intValidator = maxValue => (value) => {
    const parsed = parseInt(value, 10);
    const valid = !isNaN(parsed) && parsed > 0 && parsed < maxValue;
    return valid || `Please enter a valid integer between 0 and ${maxValue}.`;
  };
  // todo: get the tags dynamically https://gist.github.com/kizbitz/e59f95f7557b4bbb8bf2
  // https://hub.docker.com/v2/repositories/hawkular/hawkular-services/tags/?page_size=10
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
      default: 'latest',
      choices: HAWKULAR_VERSIONS
    },
    {
      type: 'list',
      name: 'cassandraVersion',
      message: 'What version of cassandra do you want to run?',
      default: '3.0.9',
      choices: CASSANDRA_VERSIONS
    },
    {
      type: 'input',
      name: 'cassandraCount',
      message: 'How many Cassandra nodes?',
      default: 1,
      validate: intValidator(10),
      filter: Number
    },
    {
      type: 'list',
      name: 'wfType',
      default: ['Standalone'],
      message: 'What kind of WildFly servers do you want to run?',
      choices: ['Standalone', 'Domain']
    },
    {
      type: 'list',
      name: 'wfStandaloneVersion',
      message: 'What version of standalone WF (hawkfly) do you want to run?',
      default: 'latest',
      choices: HAWKFLY_VERSIONS,
      when: answers => answers.wfType === 'Standalone'
    },
    {
      type: 'input',
      name: 'wfStandaloneCount',
      message: 'How many standalone servers do you want to spawn?',
      default: 1,
      validate: intValidator(30),
      filter: Number,
      when: answers => answers.wfType === 'Standalone'
    },
    {
      type: 'list',
      name: 'wfDomainVersion',
      message: 'What version of domain WF (hawkfly-domain) do you want to run?',
      default: 'latest',
      choices: HAWKFLY_VERSIONS,
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
      when: answers => answers.wfType === 'Domain'
    },
    {
      type: 'list',
      name: 'domainScenario',
      message: 'What scenario do you want to run? (details: bit.ly/hawkinit)',
      default: 'simple',
      choices: (answers) => {
        if (answers.hostControllerCount > 1) {
          return _.filter(DOMAIN_SCENARIOS, e => e !== 'default');
        }
        return DOMAIN_SCENARIOS;
      },
      when: answers => answers.wfType === 'Domain'
    }
  ];
  return inquirer.prompt(questions).then((answers) => {
    if (save) {
      console.log(chalk.green('Saving the answers to answers.json.'));
      try {
        const cwd = process.cwd();
        fs.writeFileSync(path.join(cwd, 'answers.json'), JSON.stringify(answers, null, '  '));
      } catch (err) {
        console.log(err);
      }
    }
    engine.run(answers, timeout);
  });
};

module.exports = {
  show
};
