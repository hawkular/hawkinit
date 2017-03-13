#/bin/bash
#
# Copyright 2016-2017 Red Hat, Inc. and/or its affiliates
# and other contributors as indicated by the @author tags.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

PREPARE_CLUSTER="${PREPARE_CLUSTER:-true}"
OC_CLUSTER_VERSION="${OC_CLUSTER_VERSION:-v1.4.1}"
HAWKULAR_SERVICES_IMAGE="${HAWKULAR_SERVICES_IMAGE:-hawkular/hawkular-services:0.33.0.Final}"
CASSANDRA_IMAGE="openshift/origin-metrics-cassandra:${OC_CLUSTER_VERSION}"
PROJECT_NAME="${PROJECT_NAME:-ephemeral}"
ROUTE_NAME="${ROUTE_NAME:-hawkular-services}"
ROUTE_HOSTNAME="${ROUTE_HOSTNAME:-${1}}"
TEMPLATE="${TEMPLATE:-$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/hawkular-services-ephemeral.yaml}"
FLUSH_IP_TABLES="${FLUSH_IP_TABLES:-true}"

echo_vars(){
  echo -e "Starting ephemeral Hawkular Services with following settings:\n"
  echo "PREPARE_CLUSTER=$PREPARE_CLUSTER"
  echo "OC_CLUSTER_VERSION=$OC_CLUSTER_VERSION"
  echo "HAWKULAR_SERVICES_IMAGE=$HAWKULAR_SERVICES_IMAGE"
  echo "CASSANDRA_IMAGE=$CASSANDRA_IMAGE"
  echo "PROJECT_NAME=$PROJECT_NAME"
  echo "ROUTE_NAME=$ROUTE_NAME"
  echo "ROUTE_HOSTNAME=$ROUTE_HOSTNAME"
  echo "TEMPLATE=$TEMPLATE"
  echo -e "FLUSH_IP_TABLES=$FLUSH_IP_TABLES\n\n"
}

prepare_cluster(){
  oc cluster up --version=$OC_CLUSTER_VERSION && \
  oc new-project $PROJECT_NAME
}

instantiate_template(){
  local _OC_VERSION=`oc version | grep oc | cut -f2 -d' '`
  local _OC_MAJOR=`echo ${_OC_VERSION:1:1}`
  local _OC_MINOR=`echo $_OC_VERSION | cut -f2 -d'.'`

  if [[ $_OC_MAJOR == 1 ]] && [[ $_OC_MINOR -lt 5 ]]; then
    # using the old syntax
    oc process -f $TEMPLATE -v HAWKULAR_SERVICES_IMAGE="$HAWKULAR_SERVICES_IMAGE" \
                               CASSANDRA_IMAGE="$CASSANDRA_IMAGE" \
                               ROUTE_HOSTNAME="$ROUTE_HOSTNAME" \
                               ROUTE_NAME="$ROUTE_NAME" | oc create -f -
  else
    # using the new syntax
    oc process -f $TEMPLATE --param HAWKULAR_SERVICES_IMAGE="$HAWKULAR_SERVICES_IMAGE" \
                            --param CASSANDRA_IMAGE="$CASSANDRA_IMAGE" \
                            --param ROUTE_HOSTNAME="$ROUTE_HOSTNAME" \
                            --param ROUTE_NAME="$ROUTE_NAME" | oc create -f -
  fi
}

wait_for_it(){
  local _SLEEP_SEC="4"
  printf "\n\n\nLet's wait for the route to become accessible, \nthis may take couple of minutes - "
  sleep $[$_SLEEP_SEC * 4]
  printf "$(tput setaf 6)◖$(tput sgr0)"
  sleep $[$_SLEEP_SEC * 2]

  # wait until the pod is ready
  until [ "true" = "`oc get pod -l name=$ROUTE_NAME -o json 2> /dev/null | grep \"\\\"ready\\\": \" | sed -e 's;.*\(true\|false\),;\1;'`" ]; do
    printf "$(tput setaf 6)▮$(tput sgr0)"
    sleep $_SLEEP_SEC
  done
  printf "$(tput setaf 6)◗$(tput sgr0) it's there!"
}

tell_where_it_is_running(){
  URL=`oc get route $ROUTE_NAME 2> /dev/null | grep "$ROUTE_NAME" | awk '{print $2}'` && \
  echo -e "\n\nYour Hawkular Services instance is prepared on $(tput setaf 2)http://$URL $(tput sgr0) \n"
}

main(){
  oc &> /dev/null ||  {
    echo "Install the oc client first."
    exit 1
  }

  echo_vars

  if [ "$FLUSH_IP_TABLES" = true ] ; then
    set -x
    sudo iptables -F
    set +x
  fi

  if [ "$PREPARE_CLUSTER" = true ] ; then
    prepare_cluster
  fi

  instantiate_template && \
  wait_for_it && \
  tell_where_it_is_running

  RETURN_CODE=$?
  if [[ $RETURN_CODE != 0 ]]; then
    echo  "If it failed in the 'Checking container networking' step, try to shut down the cluster, run sudo iptables -F and try again."
    exit $RETURN_CODE
  fi
}

main
