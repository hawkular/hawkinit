#!/usr/bin/env node
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
var utils         = require('./lib/utils');
var dc            = require('./lib/dockerCompose');
var checkDockerIsInstalled = require('./lib/checkCommands').checkDockerIsInstalled;
var exec          = require('child_process').exec;


// clear();
console.log('\x1B[2J');
console.log(
  chalk.blue(
    figlet.textSync('Hawkinit', {
      horizontalLayout: 'fitted'
    })
  )
);

checkDockerIsInstalled(function(){
  utils.showList();
});
