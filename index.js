#!/usr/bin/env node

const chalk = require('chalk');
const figlet = require('figlet');
const wizzard = require('./lib/wizzard');
const commandLineArgs = require('command-line-args')
const checkDockerIsInstalled = require('./lib/checkCommands').checkDockerIsInstalled;
const version = require('./package.json').version;
const usage = require('./lib/usage');
const optionDefinitions = require('./lib/options');
const _ = require('lodash');


const hawkinitWizzard = (save, timeout) => {
  console.log('\x1B[2J');
  process.stdout.write(
    chalk.blue(
      figlet.textSync('Hawkinit', {
        horizontalLayout: 'fitted'
      }).slice(0, -50)
    )
  );
  console.log(chalk.grey(` (v${version})\n`));

  checkDockerIsInstalled(() => wizzard.show(save, timeout));
}

const printVersion = () => console.log(version)

const parseArgs = () => {
  try {
    const options = commandLineArgs(optionDefinitions);
    if (_.isEmpty(options)) {
      hawkinitWizzard();
    } else if (options.version) {
      printVersion();
    } else if (options.help) {
      usage.printUsage();
    } else {
      const save = options['save-answers'];
      const timeout = !isNaN(options.timeout) ? options.timeout : 0;
      const answerFile = options['answer-file'];
      if (answerFile) {
        console.log('running with answer file ' + answerFile.filename);
        console.log('it ' + (answerFile.exists ? 'exists' : 'doesn\'t exist'));
        // todo: run w/o the wizzard, but w/ timeout.. save option doesn't make sense here => ignore it
      } else {
        hawkinitWizzard(save, timeout);
      }
    }
  } catch (err) {
    console.log('\n' + chalk.red(err.message));
    usage.printUsage();
  }
}

parseArgs();
