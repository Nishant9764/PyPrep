#!/usr/bin/env bash
set -euo pipefail

backup_dir="${1:-./backups}"
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
umask 077
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
archive="$backup_dir/pyprep-$stamp.archive.gz"

docker compose exec -T mongo mongodump --db pyprep --archive --gzip > "$archive"
shasum -a 256 "$archive" > "$archive.sha256"
echo "Backup created: $archive"
