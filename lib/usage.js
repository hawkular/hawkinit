const optionDefinitions = require('./options');
const getUsage = require('command-line-usage');
const repoUrl = require('../package.json').repository.url;

const sections = [
  {
    header: 'Hawkinit',
    content: 'This CLI tool sets up the [italic]{Hawkular} Services together with couple of servers to monitor.'
  },
  {
    header: 'Usage',
    content: '[bold]{hawkinit}\n[bold]{hawkinit} [OPTION]...\n[bold]{hawkinit} path-to-answers'
  },
  {
    header: 'Options',
    optionList: optionDefinitions
  },
  {
    content: `Project home: [underline]{${repoUrl}}`
  }
];

const printUsage = () => console.log(getUsage(sections));

module.exports = {
  printUsage
};
