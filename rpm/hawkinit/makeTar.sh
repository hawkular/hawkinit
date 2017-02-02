#!/bin/bash
set -x
[[ $# -lt 1 ]] && echo "usage: makeTar.sh name" && exit 1

version="1.3.2"
name=$1

user=$USER
exclude=`readlink -m ../../.npmignore`
thisDir=$PWD
additionalTarOptions=""
[[ "x$name" == "xhawkinit-engine" ]] && additionalTarOptions="--transform s/hawkinit/hawkinit-engine/"
cd /usr/lib/node_modules/
sudo tar -zcvf ${thisDir}/${name}-${version}.tar.gz -X ${exclude} hawkinit $additionalTarOptions > /dev/null
cd -
sudo chown $USER:$USER ${name}-${version}.tar.gz
