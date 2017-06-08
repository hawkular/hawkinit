#!/usr/bin/env bash
set -euo pipefail

# Upgrades to docker engine 1.13.0 ( https://gist.github.com/dylanscott/ea6cff4900c50f4e85a58c01477e9473 )

sudo sh -c 'echo "deb https://apt.dockerproject.org/repo ubuntu-$(lsb_release -cs) main" > /etc/apt/sources.list.d/docker.list'
curl -fsSL https://apt.dockerproject.org/gpg | sudo apt-key add -
sudo apt-key fingerprint 58118E89F3A912897C070ADBF76221572C52609D
sudo apt-get update
sudo apt-get -y install "docker-engine=1.13.1-0~ubuntu-$(lsb_release -cs)"

# Upgrades docker-compose 1.13.0 ( https://github.com/docker/compose/releases )

sudo sh -c 'curl -L https://github.com/docker/compose/releases/download/1.13.0/docker-compose-`uname -s`-`uname -m` > /usr/local/bin/docker-compose'
sudo chmod +x /usr/local/bin/docker-compose
