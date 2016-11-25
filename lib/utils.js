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
var utils         = require('./utils');
var dc            = require('./dockerCompose');
var tmp           = require('tmp');
var mustache      = require('mustache');

var runIt = function(answers, directory) {
  // run additional cassandra nodes if reqested
  if (answers.cassandraCount > 1) {
    // add shutdown hook
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
      dc.up(directory);
    } else if (answers.wfType === 'Domain') {
      dc.up('/home/jkremser/workspace/hawkfly-domain-dockerfiles/scenarios/1-host/default/');
    }
  } catch (e) {
    console.log(chalk.blue('\n\nStopping Hawkinit.\n'));
  }

};

var showList = function() {
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
      choices: ['latest', '0.22.0.Final', '0.21.0.Final', '0.20.0.Final', '0.19.0.Final', '0.0.18.Final', '0.0.16.Final', '0.0.15.Final']
    },
    {
      type: 'list',
      name: 'cassandraVersion',
      message: 'What version of cassandra do you want to run?',
      default: '3.7',
      choices: ['latest', '3.9', '3.7', '3.5', '3.4', '3.3', '3.2', '3.2.1', '3.1', '3.0', '2.2', '2.1']
    },
    {
      type: 'input',
      name: 'cassandraCount',
      message: 'How many Cassandra nodes?',
      default: 1,
      validate: intValidator(10),
      filter: Number,
      choices: ['latest', '3.9', '3.7', '3.5', '3.4', '3.3', '3.2', '3.2.1', '3.1', '3.0', '2.2', '2.1']
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
      choices: ['latest', '0.24.2', '0.24.1', '0.24.0', '0.22.0'],
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
      type: 'input',
      name: 'hostControllerCount',
      message: 'How many host controllers do you want to have in domain?',
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
      default: 'default',
      choices: ['default', 'simple', 'mid-size', 'ha', 'mixed'],
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
      //todo: pick the right template
      var template = fs.readFileSync(path.join(__dirname, '/configs/standalone/hawkfly.mustache'), 'utf8');
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
  showList : showList,
};
