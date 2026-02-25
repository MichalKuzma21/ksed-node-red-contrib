#!/usr/bin/env bash
# gen-ksef-cert.sh — generates a self-signed certificate mimicking a Polish KSeF qualified certificate
# Signature algorithm: RSASSA-PSS / SHA-256 / MGF1(SHA-256) / salt=32
#
# Usage:
#   ./gen-ksef-cert.sh [OPTIONS]
#
# Options:
#   -o, --out DIR          output directory (default: ./tmp)
#   -n, --nip NIP          NIP (tax ID) without dashes (default: 8976111986)
#   -c, --cn NAME          Common Name, e.g. "Jan Kowalski" (default: "A R")
#   -g, --given NAME       given name / GN (default: "A")
#   -s, --surname NAME     surname / SN (default: "R")
#   -d, --days N           validity in days (default: 730)
#   -b, --bits N           RSA key size (default: 2048)
#   -h, --help             show this help

set -euo pipefail

# ── defaults ────────────────────────────────────────────────────────────────
OUT_DIR="./tmp"
NIP="8976111986"
CN="A R"
GN="A"
SN_VAL="R"
DAYS=730
BITS=2048

# ── argument parsing ────────────────────────────────────────────────────────
usage() {
  grep '^#' "$0" | sed 's/^# \{0,1\}//' | tail -n +2
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -o|--out)      OUT_DIR="$2";   shift 2 ;;
    -n|--nip)      NIP="$2";       shift 2 ;;
    -c|--cn)       CN="$2";        shift 2 ;;
    -g|--given)    GN="$2";        shift 2 ;;
    -s|--surname)  SN_VAL="$2";    shift 2 ;;
    -d|--days)     DAYS="$2";      shift 2 ;;
    -b|--bits)     BITS="$2";      shift 2 ;;
    -h|--help)     usage ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

SERIAL_NUMBER="TINPL-${NIP}"
KEY_FILE="${OUT_DIR}/key.pem"
CERT_FILE="${OUT_DIR}/cert.pem"

mkdir -p "$OUT_DIR"

echo ">> Generating RSA ${BITS}-bit key..."
# -traditional forces PKCS1 format (BEGIN RSA PRIVATE KEY) — matches original key format
openssl genrsa -traditional -out "$KEY_FILE" "$BITS" 2>/dev/null

# Build subject — field order must match the reference certificate
SUBJECT="/C=PL/CN=${CN}/serialNumber=${SERIAL_NUMBER}/SN=${SN_VAL}/GN=${GN}"

echo ">> Generating self-signed certificate..."
echo "   Subject   : ${SUBJECT}"
echo "   Validity  : ${DAYS} days"
echo "   Algorithm : RSASSA-PSS / SHA-256 / MGF1(SHA-256) / salt=32"

openssl req -new -x509 \
  -key "$KEY_FILE" \
  -out "$CERT_FILE" \
  -days "$DAYS" \
  -subj "$SUBJECT" \
  -sha256 \
  -sigopt rsa_padding_mode:pss \
  -sigopt rsa_pss_saltlen:32 \
  -sigopt rsa_mgf1_md:sha256

echo ""
echo ">> Done:"
echo "   Private key  : ${KEY_FILE}"
echo "   Certificate  : ${CERT_FILE}"
echo ""
echo ">> Verification:"
openssl x509 -in "$CERT_FILE" -noout -text \
  | grep -E "(Subject:|Issuer:|Not Before|Not After|Signature Algorithm|Salt Length|Public-Key)"
