#!/bin/bash
# simple tests that runs some basic scenarios of hawkinit
# and tries to access the status endpoint

set -xe

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
if [[ "$SSL" = "1" ]] ; then
  echo '  "ssl": true,' >> ./answers
  _port="8443"
  _protocol="https"
else
  echo '  "ssl": false,' >> ./answers
  _port="8080"
  _protocol="http"
fi

# domain vs standalone
if [[ "$DOMAIN" = "1" ]] ; then
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
echo "SSL=$SSL"
echo "DOMAIN=$DOMAIN"
echo "running hawkinit with answers: "
cat ./answers
node ./index.js -a ./answers -t 5 &
_return_code=$?
# fail the test if it wasn't possible to run hawkinit
[[ $_return_code != 0 ]] && exit 1


# after 280 seconds try to do two http requests to the status endpoint
echo "waiting 280 seconds for hawkinit to start."
date
sleep 280
curl -k -I $_protocol://localhost:$_port/hawkular/status
_http_code=`curl -k -s -I -o /dev/null -w "%{http_code}" $_protocol://localhost:$_port/hawkular/status`
echo "_http_code=$_http_code"
[[ "$_http_code" -lt "200" || "$_http_code" -gt "299" ]] && exit 1

# success
echo "Test completed successfully!"
exit 0
