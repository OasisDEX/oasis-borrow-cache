#!/bin/sh
set -e

export DEBIAN_FRONTEND=noninteractive

apt -qq update && apt -yqq install jq python-pip
pip -qqq install awscli

aws secretsmanager get-secret-value --secret-id vulcan2x-gbq --region eu-central-1 |jq -rc '.SecretString | fromjson ' >> ./google-credentials.json
export GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json

yarn start-data-check
if [ $? -eq 0 ]
then
#  curl -X POST -H 'Content-Type: application/json' --data '{"text":"Oasis-cache-'"$CLUSTERENV"' Google Bigquery check has passed","icon_emoji":":white_check_mark:","username": "Spock"}' $VL_WEBHOOK_URL
  exit 0
else
  curl -X POST -H 'Content-Type: application/json' --data '{"text":"Oasis-cache-'"$CLUSTERENV"' Google Bigquery check has failed","icon_emoji":":warning:","username": "Spock"}' $VL_WEBHOOK_URL
  exit 1
fi
