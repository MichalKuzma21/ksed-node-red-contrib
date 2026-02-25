#!/bin/bash
set -e
if [ -z "$1" ]; then
    echo "Please provide input file"
    exit 1
fi

FILE="$1"
echo "Will use file $1"

URL="http://127.0.0.1:1880/nodes"

curl -X POST "$URL" \
  -H "Node-RED-API-Version: v2" \
  -F "tarball=@${FILE}"

