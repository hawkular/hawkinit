'use strict';

module.exports = Object.freeze({
  // constants
  HAWKFLY_VERSIONS: ['latest', '0.24.2', '0.24.1'],
  HAWKFLY_VERSION_DEFAULT: 'latest',
  HAWKFLY_NEW_VERSIONS: ['latest', '1.0.0.CR4', '1.0.0.CR3', '1.0.0.CR2', '1.0.0.CR1'],
  HAWKFLY_NEW_VERSION_DEFAULT: 'latest',
  HAWKULAR_VERSIONS: ['latest', 'devel', '0.38.0.Final', '0.37.0.Final', '0.36.0.Final', '0.35.0.Final',
    '0.34.0.Final', '0.33.0.Final', '0.32.0.Final', '0.31.0.Final', '0.30.0.Final', '0.22.0.Final'],
  HAWKULAR_VERSION_DEFAULT: '0.38.0.Final',
  CASSANDRA_VERSIONS: ['latest', '3.9', '3.7', '3.5', '3.4', '3.3', '3.2', '3.2.1', '3.1', '3.0.9', '3.0', '2.2',
    '2.1'],
  CASSANDRA_VERSION_DEFAULT: '3.0.9',
  DOMAIN_SCENARIOS: ['default', 'simple', 'mid-size', 'ha', 'mixed'],
  DOMAIN_SCENARIO_DEFAULT: 'simple',

  // timeout for querying the dockerhub service in ms
  DOCKERHUB_TIMEOUT_BASIC_MODE: 400,
  DOCKERHUB_TIMEOUT_FULL_MODE: 3000
});
