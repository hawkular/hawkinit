'use strict';

// modules
const chalk = require('chalk');
const check = require('./checkCommands');
const constants = require('./constants');
const CLI = require('clui');
const RestClient = require('node-rest-client').Client;

const Spinner = CLI.Spinner;

const intValidator = maxValue => (value) => {
  const parsed = parseInt(value, 10);
  const valid = !isNaN(parsed) && parsed > 0 && parsed < maxValue;
  return valid || `Please enter a valid integer between 0 and ${maxValue}.`;
};

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const timeoutWrapper = (promise, defaults, spinner, msg, full) => {
  const timeout = full ? constants.DOCKERHUB_TIMEOUT_FULL_MODE : constants.DOCKERHUB_TIMEOUT_BASIC_MODE;
  const first = Promise.race([promise, wait(timeout).then(() => 'timeout')]);
  return first.then((result) => {
    if (result === 'timeout') {
      spinner.message(msg + chalk.magenta(` timeout ${timeout}ms hit, using defaults`));
      return wait(500).then(() => {
        spinner.stop();
        return defaults;
      });
    }
    return result;
  });
};

// Based on this: https://gist.github.com/kizbitz/e59f95f7557b4bbb8bf2
const dockerHubLoadTags = (account, image, defaults, full) => {
  const client = new RestClient();
  const msg = `Fetching the image tags for ${image} from hub.docker.com...`;
  const spinner = new Spinner(msg);
  spinner.start();
  const dockerHubPromise = new Promise((resolve) => {
    const fetchNext = (current, nextURL) => {
      client.get(nextURL, (data) => {
        for (let i = 0; i < data.results.length; i += 1) {
          current.push(data.results[i].name);
        }
        if (data.next) {
          fetchNext(current, data.next);
        } else {
          spinner.stop();
          resolve(current);
        }
      }).on('error', () => {
        spinner.stop();
        resolve(defaults);
      });
    };
    fetchNext([], `https://hub.docker.com/v2/repositories/${account}/${image}/tags/?page_size=10`);
  });
  return timeoutWrapper(dockerHubPromise, defaults, spinner, msg, full);
};

const hwkVersions = (framework, full) => {
  // checking if the oc or docker-compose are installed as a side effect
  if (check.orchestrationFrameworkValidator(framework)) {
    return dockerHubLoadTags('hawkular', 'hawkular-services', constants.HAWKULAR_VERSIONS, full);
  }
  return [];
};

module.exports = {
  intValidator,
  dockerHubLoadTags,
  hwkVersions
};
