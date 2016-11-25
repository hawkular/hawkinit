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


// clear();
console.log('\x1B[2J');
console.log(
  chalk.blue(
    figlet.textSync('Hawkinit', {
       horizontalLayout: 'fitted'
     })
  )
);

utils.showList();

// var ui = new inquirer.ui.BottomBar();
// ui.log.write('something just happened.');
// ui.log.write('Almost over, standby!');
