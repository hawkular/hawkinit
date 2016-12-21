# Hawkinit

Simple CLI tool that spawns linked docker containers with [Hawkular](http://hawkular.org) and some monitored stuff.

[![Build Status](https://travis-ci.org/Jiri-Kremser/hawkinit.svg?branch=master)](https://travis-ci.org/Jiri-Kremser/hawkinit)
[![npm version](https://badge.fury.io/js/hawkinit.svg)](https://badge.fury.io/js/hawkinit)

## About

This simple CLI tool helps you with starting the hawkular-services together with some monitored WildFly servers. Internally, it uses the docker-compose tool and exposes the service on `localhost:8080`.

## How to install

```bash
$ npm install hawkinit -g
```

## Usage

```bash
$ hawkinit
```
Choose the versions of `hawkular-services`, Cassandra and instrumented WildFly server you want to start, number of containers or if you want to run WF in standalone mode or in a managed domain. For the domain mode couple of [scenarios](https://github.com/Jiri-Kremser/hawkfly-domain-dockerfiles#scenarios) are prepared. Once every question is answered, you should start seeing the logs from particular containers. Congrats, your hawkular-service is up and running on `http://localhost:8080`.

![cli demo](https://github.com/Jiri-Kremser/hawkinit/blob/master/demo.gif)

## Requirements
The `hawkinit` assumes the `docker` and `docker-compose` to be installed, Docker version should be higher than `1.12.0` and also the user that runs the command should be in the `docker` group.

```bash
sudo usermod -a -G docker `whoami`
```

Make sure the docker deamon is up and running.

```bash
sudo systemctl enable docker --now
```

### Fedora
On Fedora 24 the Docker that is in the default yum repo is obsolete, so remove it and install the docker-engine package from the yum.dockerproject.org repo.

`sudo dnf remove docker` and follow these instructions https://docs.docker.com/engine/installation/linux/fedora/

### Debian
`sudo apt-get install docker.io docker-compose`



