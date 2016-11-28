'use strict';

var chalk         = require('chalk');
var clear         = require('clear');
var CLI           = require('clui');
var figlet        = require('figlet');
var inquirer      = require('inquirer');
var Preferences   = require('preferences');
var Spinner       = CLI.Spinner;
var _             = require('lodash');
var fs            = require('fs');
var path          = require('path');
var dc            = require('./dockerCompose');
var tmp           = require('tmp');
var mustache      = require('mustache');


var HAWKFLY_VERSIONS = ['latest', '0.24.2', '0.24.1', '0.24.0', '0.22.0'];
var HAWKULAR_VERSIONS = ['latest', '0.22.0.Final', '0.21.0.Final', '0.20.0.Final', '0.19.0.Final', '0.0.18.Final',
'0.0.16.Final', '0.0.15.Final'];
var CASSANDRA_VERSIONS = ['latest', '3.9', '3.7', '3.5', '3.4', '3.3', '3.2', '3.2.1', '3.1', '3.0', '2.2', '2.1'];
var DOMAIN_SCENARIOS = ['default', 'simple', 'mid-size', 'ha', 'mixed'];

var runIt = function(answers, directory) {
  process.on('exit', function () {
    console.log(chalk.cyan('Removing containers created by docker-compose script.'));
    dc.rm(directory);
  });

  // run additional cassandra nodes if reqested
  if (answers.cassandraCount > 1) {
    // add shutdown hook for C* containers
    process.on('exit', function () {
      console.log(chalk.cyan('Removing Cassandra containers.'));
      dc.cassandraCleanup(answers.cassandraVersion);
    });

    for (var i = 1; i < answers.cassandraCount; i++) {
      console.log(chalk.cyan('Starting Cassandra node ' + i));
      dc.runCassandra(answers.cassandraVersion, ('0' + i).slice(-2));
    }
  }
  try {
    if (answers.wfType === 'Standalone') {
      if (answers.wfStandaloneCount > 1) {
        dc.scale(directory, 'hawkfly', answers.wfStandaloneCount);
      }
    } else if (answers.wfType === 'Domain') {
      if (answers.hostControllerCount > 2) {
        var domainScenarioServiceMapping = function(domainScenario) {
          switch (domainScenario) {
            case 'mid-size':
            return `hawkfly-domain-middle-slave`;
            break;
            case 'small':
            return `hawkfly-domain-simple-slave`;
            break;
            default:
            return `hawkfly-domain-${domainScenario}-slave`;
            break;
          }
        };
        dc.scale(directory, domainScenarioServiceMapping(answers.domainScenario), answers.hostControllerCount - 1);
      }
    }
    dc.up(directory);
  } catch (e) {
    console.log(chalk.blue('\n\nStopping Hawkinit.\n'));
  }
};

var getTheTemplatePath = function(answers) {
  if (answers.wfType === 'Standalone') {
    return '/configs/standalone/hawkfly.mustache';
  } else {
    // domain
    var path = '/configs/domain/';
    path += (answers.hostControllerCount > 1) ? 'n-hosts/' : '1-host/';
    path += answers.domainScenario + '/docker-compose.mustache';
    return path;
  }
};

var show = function() {
  var intValidator = function (maxValue) {
    return function (value) {
      var parsed = parseInt(value);
      var valid = !isNaN(parsed) && parsed > 0 && parsed < maxValue;
      return valid || `Please enter a valid integer between 0 and ${maxValue}.`;
    };
  };
  // todo: get the tags dynamically https://gist.github.com/kizbitz/e59f95f7557b4bbb8bf2
  var questions = [
    {
      type: 'list',
      name: 'hawkVersion',
      message: 'What version of hawkular services do you want to run?',
      default: '0.20.0.Final',
      choices: HAWKULAR_VERSIONS
    },
    {
      type: 'list',
      name: 'cassandraVersion',
      message: 'What version of cassandra do you want to run?',
      default: '3.7',
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
      default: '0.24.1',
      choices: HAWKFLY_VERSIONS,
      when: function(answers) {
        return answers.wfType === 'Standalone';
      }
    },
    {
      type: 'input',
      name: 'wfStandaloneCount',
      message: 'How many standalone servers do you want to spawn?',
      default: 1,
      validate: intValidator(30),
      filter: Number,
      when: function(answers) {
        return answers.wfType === 'Standalone';
      }
    },
    {
      type: 'list',
      name: 'wfDomainVersion',
      message: 'What version of domain WF (hawkfly-domain) do you want to run?',
      default: '0.24.1',
      choices: HAWKFLY_VERSIONS,
      when: function(answers) {
        return answers.wfType === 'Domain';
      }
    },
    {
      type: 'input',
      name: 'hostControllerCount',
      message: 'How many host controllers do you want to have in domain? (1 is always the domain controller and others are host controllers)',
      default: 1,
      validate: intValidator(10),
      filter: Number,
      when: function(answers) {
        return answers.wfType === 'Domain';
      }
    },
    {
      type: 'list',
      name: 'domainScenario',
      message: 'What scenario do you want to run? (details: bit.ly/hawkinit)',
      default: 'simple',
      choices: function(answers) {
        if (answers.hostControllerCount > 1) {
          return _.filter(DOMAIN_SCENARIOS, function(e) {
            return e !== 'default';
          });
        }
        return DOMAIN_SCENARIOS;
      },
      when: function(answers) {
        return answers.wfType === 'Domain';
      }
    }
  ];
  return inquirer.prompt(questions).then(function(answers) {
    var status = new Spinner('Running the infrastructure...');
    status.start();
    console.log('answers:\n' + chalk.cyan(JSON.stringify(answers, null, '  ')));

    try {
      var templatePath = getTheTemplatePath(answers);
      var template = fs.readFileSync(path.join(__dirname, templatePath), 'utf8');
      var result = mustache.render(template, answers);
      // console.log(result);
      tmp.dir('/tmp/hawkinit-', function(err, directory) {
        if (err) {
          throw err;
        }
        fs.writeFileSync(directory + '/docker-compose.yaml', result);
        // console.log(directory);
        setTimeout(function() {
          status.stop();
          runIt(answers, directory);
        }, 1000);
      });
    } catch (e) {
      console.log(chalk.red(e));
    }
  });
};

module.exports = {
  show: show,
};
