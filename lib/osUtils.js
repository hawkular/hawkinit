'use strict';

const chalk = require('chalk');
const exe = require('child_process').execSync;

const prepareVolumeDirs = () => {
  const volumeHome = '/tmp/opt/hawkular';
  const createDir = `mkdir -p ${volumeHome}`;
  const changeOwnership = `chown 1000:1000 -R ${volumeHome}`;
  const changeSELinuxContext = label => `chcon -Rt ${label} ${volumeHome}`;
  const changePermissions = `chmod go+w -R ${volumeHome}`;
  const cmd1 = `${createDir} && ${changeOwnership}`;
  const cmd21 = changeSELinuxContext('svirt_sandbox_file_t');
  const cmd22 = changeSELinuxContext('container_file_t');
  const seUser = '`ls -Zd /tmp/opt/hawkular | cut -f1 -d\':\'`';
  const seRole = '`ls -Zd /tmp/opt/hawkular | cut -f2 -d\':\'`';
  const seType = '`ls -Zd /tmp/opt/hawkular | cut -f3 -d\':\'`';
  const seRange = '`ls -Zd /tmp/opt/hawkular | cut -f4 -d\':\' | cut -f1 -d\' \'`';
  const cmd23 = `chcon -R -u ${seUser} -t ${seType} -r ${seRole} -l ${seRange} ${volumeHome}`;
  const cmd3 = changePermissions;
  try {
    exe(cmd1);
  } catch (e) {
    console.log(chalk.red(`Unable to change the ownership of ${volumeHome}. ` +
      `Please do it manually by running command: sudo chown 1000:1000 -R ${volumeHome}`));
  }
  try {
    exe(cmd21);
  } catch (e1) {
    try {
      // fallback method 2 (works on Ubuntu)
      exe(cmd22);
    } catch (e2) {
      try {
        // fallback method 3
        exe(cmd23);
      } catch (e3) {
        console.log(chalk.red(`Unable to change the SE Linux context of ${volumeHome} to svirt_sandbox_file_t or ` +
           `container_file_t. Please do it manually by running command: sudo ${cmd21}`));
      }
    }
  }
  try {
    exe(cmd3);
  } catch (e) {
    console.log(chalk.red(`Unable to change the permissions of ${volumeHome}. ` +
      `Please do it manually by running command: sudo ${cmd3}`));
  }
};

module.exports = {
  prepareVolumeDirs
};
