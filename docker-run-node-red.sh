#!/bin/bash
set -e 

DIR="$(pwd)/tmp"        
CONTAINER_NAME="mynodered"
IMAGE="nodered/node-red:4.1.2"
PORT=1880

mkdir -p "$DIR"

docker run -d \
  --name "$CONTAINER_NAME" \
  -p "$PORT":1880 \
  -v "$DIR":/data \
  "$IMAGE"

echo "Node-RED started with data located at $DIR"

