#!/bin/sh
# simple tests that runs some basic scenarios of hawkinit
# and tries to access the status endpoint

set -xe

# run linter
npm run lint
_return_code=$?
# fail the test if linter fails
[[ $_return_code != 0 ]] && exit 1

# install hawkinit
sudo npm install -g .
_return_code=$?
# fail the test if it's not possible to install hawkinit
[[ $_return_code != 0 ]] && exit 1

# generate the answer file
cat >./answers <<EOL
{
  "cassandraCount": 1,
  "cassandraVersion": "3.0.9",
  "defaultCredentials": true,
  "hawkAgent": "javaAgent",
  "hawkVersion": "latest",
  "hawkflyWfEap": "WildFly",
  "hawkinitVersion": "1.9.0",
  "orchestrationFramework": "docker-compose",
  "wfEap": "WildFly",
  "wfStandaloneCount": 1,
  "wfStandaloneVersion": "latest",
  "wildflyImmutableAgent": true,
EOL

# ssl
if [[ "$TEST_SSL" = "1" ]] ; then
  echo '  "ssl": true,' >> ./answers
  _hawkular_port="8443"
else
  echo '  "ssl": false,' >> ./answers
  _hawkular_port="8080"
fi

# domain vs standalone
if [[ "$TEST_DOMAIN" = "1" ]] ; then
  cat >>./answers <<EOL
  "wfType": "Domain",
  "domainScenario": "simple",
  "hostControllerCount": 1,
  "wfDomainVersion": "latest"
}
EOL
else
  cat >>./answers <<EOL
  "wfType": "Standalone"
}
EOL
fi

# run hawkinit with the answer file and timeout 5 minutes
echo "TEST_SSL=$TEST_SSL"
echo "TEST_DOMAIN=$TEST_DOMAIN"
echo "running hawkinit with answers: "
cat ./answers
hawkinit -a ./answers -t 5 &> /tmp/hawkinit.log &

# after 280 seconds try to curl the status endpoint
echo "waiting 280 seconds for hawkinit to start."
sleep 280
_http_code=`curl -k -s -I -o /dev/null -w "%{http_code}" http://localhost:$_hawkular_port/hawkular/status`
[[ "$_http_code" -lt "200" || "$_http_code" -gt "299" ]] && echo "something went wrong, here is the log: " && \\
  cat /tmp/hawkinit.log && exit 1

# success
echo "Test completed successfully!"
exit 0
