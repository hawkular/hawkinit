#!/bin/bash
version="1.3.2"

user=$USER
exclude=`readlink -m ../.npmignore`
thisDir=$PWD
cd /usr/lib/node_modules/
sudo tar -zcvf ${thisDir}/hawkinit-${version}.tar.gz -X ${exclude} hawkinit
cd -
sudo chown $USER:$USER hawkinit-${version}.tar.gz
