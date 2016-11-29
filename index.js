#!/usr/bin/env node
'use strict';

const chalk         = require('chalk');
const clear         = require('clear');
const CLI           = require('clui');
const figlet        = require('figlet');
const inquirer      = require('inquirer');
const Preferences   = require('preferences');
const Spinner       = CLI.Spinner;
const _             = require('lodash');
const fs            = require('fs');
const wizzard       = require('./lib/wizzard');
const dc            = require('./lib/dockerCompose');
const checkDockerIsInstalled = require('./lib/checkCommands').checkDockerIsInstalled;
const exec          = require('child_process').exec;


// clear();
console.log('\x1B[2J');
console.log(
  chalk.blue(
    figlet.textSync('Hawkinit', {
      horizontalLayout: 'fitted'
    })
  )
);

checkDockerIsInstalled(() => wizzard.show());
