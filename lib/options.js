const fs = require('fs');

function FileDetails(filename) {
  if (!(this instanceof FileDetails)) return new FileDetails(filename);
  this.filename = filename;
  this.exists = fs.existsSync(filename);
}

module.exports = [
  {
    name: 'answer-file',
    alias: 'a',
    typeLabel: '[underline]{file}',
    description: 'The path to the file with the answers. This runs the non-interactive mode.',
    type: FileDetails,
    defaultOption: true
  },
  {
    name: 'save-answers',
    alias: 's',
    description: 'The answer file called answers.json will be generated in the current working directory.',
    type: Boolean
  },
  {
    name: 'timeout',
    description: 'Timeout value in minutes. After this time, all the running docker containers will be stopped.',
    alias: 't',
    type: Number,
    typeLabel: '[underline]{minutes}'
  },
  {
    name: 'version',
    alias: 'v',
    type: Boolean,
    description: 'Print the Hawkinit version.'
  },
  {
    name: 'help',
    description: 'Prints this usage guide.',
    alias: 'h',
    type: Boolean
  }
];
