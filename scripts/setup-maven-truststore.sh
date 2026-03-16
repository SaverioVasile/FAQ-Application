#!/usr/bin/.env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CERTS_DIR="$PROJECT_DIR/.certs"
CHAIN_FILE="$CERTS_DIR/repo-maven-chain.pem"
TRUSTSTORE_FILE="$CERTS_DIR/maven-truststore.p12"

mkdir -p "$CERTS_DIR"

echo | openssl s_client \
  -connect repo.maven.apache.org:443 \
  -servername repo.maven.apache.org \
  -showcerts 2>/dev/null \
  | awk '/BEGIN CERTIFICATE/,/END CERTIFICATE/{print}' > "$CHAIN_FILE"

awk 'BEGIN{n=0} /BEGIN CERTIFICATE/{n++; f=sprintf("%s/repo-maven-cert-%02d.pem", certs, n)} {if(f) print > f} /END CERTIFICATE/{close(f)}' certs="$CERTS_DIR" "$CHAIN_FILE"

rm -f "$TRUSTSTORE_FILE"
for cert in "$CERTS_DIR"/repo-maven-cert-*.pem; do
  alias_name="$(basename "$cert" .pem)"
  keytool -importcert -noprompt \
    -storetype PKCS12 \
    -keystore "$TRUSTSTORE_FILE" \
    -storepass changeit \
    -alias "$alias_name" \
    -file "$cert" >/dev/null
  echo "Imported $cert"
done

echo "Truststore ready: $TRUSTSTORE_FILE"

