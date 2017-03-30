#!/usr/bin/env node

const _ = require('lodash');
const figlet = require('figlet');
const chalk = require('chalk');
const checkDockerIsInstalled = require('./lib/checkCommands').checkDockerIsInstalled;
const commandLineArgs = require('command-line-args');
const engine = require('./lib/engine');
const fs = require('fs');
const path = require('path');
const optionDefinitions = require('./lib/options');
const usage = require('./lib/usage');
const version = require('./package.json').version;
const wizzard = require('./lib/wizzard');

const hawkinitWizzard = (save, timeout) => {
  // clear the screen
  console.log('\x1B[2J');

  // show the ascii logo
  const logo = fs.readFileSync(path.join(__dirname, 'logo'), 'utf8');
  console.log(logo);

  // .. and the ascii label
  process.stdout.write(
    chalk.blue(
      figlet.textSync('Hawkinit', {
        horizontalLayout: 'fitted'
      }).slice(0, -50)
    )
  );
  console.log(chalk.grey(` (v${version})\n`));

  checkDockerIsInstalled(() => wizzard.show(save, timeout));
};

const hawkinitRun = (answers, timeout) => {
  checkDockerIsInstalled(() => engine.run(answers, timeout));
};

const printVersion = () => console.log(version);

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
        if (!answerFile.exists) {
          console.log(chalk.red(`The specified answer file ${answerFile.filename} doesn't exist.`));
          process.exit(1);
          return;
        }
        const answers = fs.readFileSync(answerFile.filename, 'utf8');
        console.log(chalk.green(`Running the hawkinit with answer file ${answerFile.filename}`));
        try {
          const parsedAnswers = JSON.parse(answers);
          hawkinitRun(parsedAnswers, timeout);
        } catch (err) {
          console.log(chalk.red(`Unable to parse the specified answer file ${answerFile.filename}.
            \nBecause of:\n ${err}`));
          process.exit(2);
        }
      } else {
        hawkinitWizzard(save, timeout);
      }
    }
  } catch (err) {
    console.log(`\n${chalk.red(err.message)}`);
    usage.printUsage();
    process.exit(3);
  }
};

parseArgs();
