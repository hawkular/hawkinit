'use strict';

var execSync = require('child_process').execSync;
var exec = require('child_process').exec;
var chalk = require('chalk');

var runDockerComposeCommand = function(command, path, asynchronous) {
  var options = {
    cwd: path,
    killSignal: 'SIGTERM',
    encoding: 'utf8',
    maxBuffer: 10*1024*1024,
    stdio: ['inherit', 'inherit', 'inherit']
  };
  console.log(chalk.cyan(`Running '${command}' in directory: ${path}`));
  var executable = asynchronous ? exec : execSync;
  var dc = executable(command, options);
  dc && dc.stdout.on('data', (data) => {
    data && console.log(`${data}`);
  });
  dc && dc.stderr.on('data', (data) => {
    data && console.log(`stderr: ${data}`);
  });
  return dc;
};

var dockerComposeUp = function(path, asynchronous) {
  return runDockerComposeCommand('docker-compose up --force-recreate', path, asynchronous);
};

var dockerComposeRm = function(path) {
  return runDockerComposeCommand('docker-compose rm --force --all', path, false);
};

var dockerRunCassandraNode = function(version, id) {
  var container = "docker ps | grep cassandra:" + version + " | cut -f1 -d' '"
  var ip = "docker inspect --format='{{ .NetworkSettings.IPAddress }}' `" + container + "`";
  var cmd = "docker run --name cassandra-node-" + id + " -d -e CASSANDRA_SEEDS=\"$(" + ip + ")\" cassandra:" + version;
  // console.log(cmd);
  return runDockerComposeCommand('sleep 4 && echo "running C*.." && ' + cmd, '.', true);
};

var dockerKillAllCassandraNodes = function(version) {
  var containers = "docker ps -a | grep 'cassandra:" + version + ".*cassandra-node-' | cut -f1 -d' '";
  var cmd = "docker rm -f `" + containers +"`";
  return runDockerComposeCommand(cmd, '.', true);
};

var dockerComposeScale = function(path, service, instances) {
  return runDockerComposeCommand(`sleep 7 && docker-compose scale ${service}=${instances}`, path, true);
};

module.exports = {
  up: dockerComposeUp,
  rm: dockerComposeRm,
  scale: dockerComposeScale,
  runCassandra: dockerRunCassandraNode,
  cassandraCleanup: dockerKillAllCassandraNodes
};
