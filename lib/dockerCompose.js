'use strict';

const execSync = require('child_process').execSync;
const exec = require('child_process').exec;
const chalk = require('chalk');

const runCommand = (command, path, asynchronous) => {
  const options = {
    cwd: path,
    killSignal: 'SIGTERM',
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    stdio: ['inherit', 'inherit', 'inherit']
  };
  console.log(chalk.cyan(`Running '${command}' in directory: ${path}`));
  const executable = asynchronous ? exec : execSync;
  const dc = executable(command, options);
  dc && dc.stdout.on('data', (data) => {
    data && console.log(`${data}`);
  });
  dc && dc.stderr.on('data', (data) => {
    data && console.log(`stderr: ${data}`);
  });
  return dc;
};

const dockerComposeUp = (path, asynchronous) =>
  runCommand('docker-compose up --force-recreate', path, asynchronous);

const dockerComposeRm = (path, timeout) => {
  if (timeout > 0) {
    runCommand(`sleep ${timeout} && docker-compose rm --force --all`, path, true);
  } else {
    runCommand('docker-compose rm --force --all', path, false);
  }
};

const dockerComposeKill = (path, timeout) => {
  if (timeout > 0) {
    runCommand(`sleep ${timeout} && docker-compose kill`, path, true);
    dockerComposeRm(path, timeout + 2);
  } else {
    runCommand('docker-compose rm --force --all', path, false);
  }
};

const openshiftKill = (path, timeout) => {
  if (timeout > 0) {
    runCommand(`sleep ${timeout} && oc cluster down`, path, true);
  } else {
    runCommand('oc cluster down', path, false);
  }
};

const dockerRunCassandraNode = (version, id) => {
  const container = `docker ps | grep cassandra:${version} | cut -f1 -d' '`;
  const ip = `docker inspect --format='{{ .NetworkSettings.IPAddress }}' \`${container}\``;
  const cmd = `docker run --name cassandra-node-${id} -d -e CASSANDRA_SEEDS="$(${ip})" cassandra:${version}`;
  return runCommand(`sleep 4 && echo "running C*.." && ${cmd}`, '.', true);
};

const dockerKillAllCassandraNodes = (version) => {
  const containers = `docker ps -a | grep 'cassandra:${version}.*cassandra-node-' | cut -f1 -d' '`;
  const cmd = `docker rm -f \`${containers}\``;
  return runCommand(cmd, '.', true);
};

const dockerComposeScale = (path, service, instances) =>
  runCommand(`sleep 7 && docker-compose scale ${service}=${instances}`, path, true);

module.exports = {
  up: dockerComposeUp,
  rm: dockerComposeRm,
  kill: dockerComposeKill,
  scale: dockerComposeScale,
  runCassandra: dockerRunCassandraNode,
  cassandraCleanup: dockerKillAllCassandraNodes,
  ocKill: openshiftKill
};
