#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

JAR_PATH="target/faq-backend-0.0.1-SNAPSHOT.jar"
ZIP_PATH="backend-beanstalk.zip"

if [[ ! -f "$JAR_PATH" ]]; then
  echo "Jar non trovato in $JAR_PATH"
  echo "Esegui prima: mvn clean package"
  exit 1
fi

rm -f "$ZIP_PATH"
zip "$ZIP_PATH" Dockerfile "$JAR_PATH"

echo "Creato $ZIP_PATH"

