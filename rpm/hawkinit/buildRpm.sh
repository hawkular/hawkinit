#!/bin/bash

[[ $# -lt 1 ]] && echo "usage: buildRpm.sh name" && exit 1
name=$1

./makeTar.sh $name
fedpkg --release f25 local
