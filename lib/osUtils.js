'use strict';

const chalk = require('chalk');
const exe = require('child_process').execSync;

const prepareVolumeDirs = () => {
  const volumeHome = '/tmp/opt/hawkular';
  const createDir = `mkdir -p ${volumeHome}`;
  const changeOwnership = `chown 1000:1000 -R ${volumeHome}`;
  const changeSELinuxContext = `chcon -Rt container_file_t ${volumeHome}`;
  const changePermissions = `chmod go+w -R ${volumeHome}`;
  const cmd1 = `${createDir} && ${changeOwnership}`;
  const cmd2 = changeSELinuxContext;
  const cmd3 = changePermissions;
  try {
    exe(cmd1);
  } catch (e) {
    console.log(chalk.red(`Unable to change the ownership of ${volumeHome}. ` +
      `Please do it manually by running command: sudo chown 1000:1000 -R ${volumeHome}`));
    process.exit(1);
  }
  try {
    exe(cmd2);
  } catch (e) {
    console.log(chalk.red(`Unable to change the SE Linux context of ${volumeHome} to container_file_t. ` +
      `Please do it manually by running command: sudo ${cmd2}`));
    process.exit(1);
  }
  try {
    exe(cmd3);
  } catch (e) {
    console.log(chalk.red(`Unable to change the permissions of ${volumeHome}. ` +
      `Please do it manually by running command: sudo ${cmd3}`));
    process.exit(1);
  }
};

module.exports = {
  prepareVolumeDirs
};
