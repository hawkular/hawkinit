#!/usr/bin/env node

const chalk = require('chalk');
const figlet = require('figlet');
const wizzard = require('./lib/wizzard');
const checkDockerIsInstalled = require('./lib/checkCommands').checkDockerIsInstalled;

console.log('\x1B[2J');
console.log(
  chalk.blue(
    figlet.textSync('Hawkinit', {
      horizontalLayout: 'fitted'
    })
  )
);

checkDockerIsInstalled(() => wizzard.show());
