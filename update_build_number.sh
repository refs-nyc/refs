#!/bin/bash

PROJECT_ID="da57a930-b9ea-4cf9-b722-b2ff8bbf7208"
PLATFORM="ios"
NEW_VERSION="140"

curl "https://expo.dev/_expo/version-management/api/projects/${PROJECT_ID}/versions" \
  -X PATCH \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EXPO_TOKEN" \
  -d '{"platform":"'"${PLATFORM}"'","versionNumber":"'"${NEW_VERSION}"'"}'
