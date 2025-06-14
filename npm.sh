#!/bin/bash

set -euo pipefail

SCRIPTPATH="$(cd "$(dirname "$0")" >/dev/null 2>&1 || exit; pwd -P)"

AWS_ACCOUNT_ID="164290132769"
AWS_PROFILE="AWS-Repository"
AWS_REGION="eu-west-1"

CODE_ARTIFACT_DOMAIN="fineos"
CODE_ARTIFACT_REGISTRY="fineos-shared-library"

echo "Retriving CodeArtifact auth token for domain $CODE_ARTIFACT_DOMAIN, domain-owner $AWS_ACCOUNT_ID and region $AWS_REGION using $AWS_PROFILE profile."

authorizationToken=$(aws codeartifact get-authorization-token --domain "$CODE_ARTIFACT_DOMAIN" --domain-owner "$AWS_ACCOUNT_ID" --profile "$AWS_PROFILE" --region "$AWS_REGION" --query authorizationToken --output text)

echo "CodeArtifact auth token retrieved."

content="registry=https://$CODE_ARTIFACT_DOMAIN-$AWS_ACCOUNT_ID.d.codeartifact.$AWS_REGION.amazonaws.com/npm/$CODE_ARTIFACT_REGISTRY/
//fineos-$AWS_ACCOUNT_ID.d.codeartifact.$AWS_REGION.amazonaws.com/npm/$CODE_ARTIFACT_REGISTRY/:always-auth=true
//fineos-$AWS_ACCOUNT_ID.d.codeartifact.$AWS_REGION.amazonaws.com/npm/$CODE_ARTIFACT_REGISTRY/:_authToken=$authorizationToken
"

echo "$content" > "$SCRIPTPATH/.npmrc"

echo "Local .npmrc udpated."