# Hawkinit

Simple CLI tool that spawns linked docker containers with [Hawkular](http://hawkular.org) and some monitored stuff.

[![Build Status](https://travis-ci.org/hawkular/hawkinit.svg?branch=master)](https://travis-ci.org/hawkular/hawkinit)
[![npm version](https://badge.fury.io/js/hawkinit.svg)](https://badge.fury.io/js/hawkinit)

## About

This simple CLI tool helps you with starting the hawkular-services together with some monitored WildFly servers. Internally, it uses the docker-compose tool and exposes the service on `localhost:8080`.

## How to install

```bash
$ sudo npm install hawkinit -g
```

## Usage

```bash
$ hawkinit
```
Choose the versions of `hawkular-services`, Cassandra and instrumented WildFly server you want to start, number of containers or if you want to run WF in standalone mode or in a managed domain. For the domain mode couple of [scenarios](https://github.com/Jiri-Kremser/hawkfly-domain-dockerfiles#scenarios) are prepared. Once every question is answered, you should start seeing the logs from particular containers. Congrats, your hawkular-service is up and running on `http://localhost:8080`.

For more help:

```bash
$ hawkinit -h
```

![cli demo](https://github.com/hawkular/hawkinit/raw/gif/demo.gif)

## Requirements
The `hawkinit` assumes the `docker` and `docker-compose` to be installed, Docker version should be higher than `1.12.0` and also the user that runs the command should be in the `docker` group.

```bash
sudo usermod -a -G docker `whoami`
```

Add yourself to that group for current session (or logout and log in).
```bash
newgrp docker
```

Make sure the docker deamon is up and running.

```bash
sudo systemctl enable docker --now
```

Make sure the `/tmp/opt/data` is created and owned by user with `UID = 1000`.
Running following command as non-root (as user with `UID=1000`) should work.

```bash
mkdir -p /tmp/opt/data/ && sudo chown -R $UID:$UID /tmp/opt/data/
```

### Fedora
On Fedora 24 the Docker that is in the default yum repo is obsolete, so remove it and install the docker-engine package from the yum.dockerproject.org repo.

`sudo dnf remove docker` and follow these instructions https://docs.docker.com/engine/installation/linux/fedora/

### Debian
`sudo apt-get install docker.io docker-compose`

## Updating
Hawkinit is a regular npm package so all is needed is

```bash
sudo npm update hawkinit -g
```

## Troubleshooting
If you run the hawkinit, it says something like:

```bash
Later, you can find your hawkular-services listening on http://localhost:8080
Running 'docker-compose up --force-recreate' in directory: /tmp/tmp-11573k3ujXFLACh9z
```

If you navigate to `/tmp/tmp-11573k3ujXFLACh9z`, you can run `docker-dompose up` to start it again. This is not a standard use-case, though. Any other `docker-compose` command works just fine. So for instance you may want to see only the Cassandra logs by `docker-compose logs -f myCassandra` or inspecting the Hawkular Services container by `docker-compose exec hawkular /bin/bash`, etc. Also, nothing protects you from editing the `docker-compose.yaml` file that was created in that tmp directory.

