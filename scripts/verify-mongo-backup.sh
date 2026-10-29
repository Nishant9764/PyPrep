#!/usr/bin/env bash
set -euo pipefail

archive="${1:?Usage: scripts/verify-mongo-backup.sh path/to/pyprep.archive.gz}"
if [[ ! -s "$archive" ]]; then
  echo "Backup archive is missing or empty: $archive" >&2
  exit 1
fi
if [[ -f "$archive.sha256" ]]; then
  shasum -a 256 -c "$archive.sha256"
fi

# Restore into a fresh, uniquely named database. This exercises recovery without replacing the
# live pyprep database. Keep this copy only as long as needed, then remove it through mongosh.
restore_db="pyprep_recovery_check_$(date -u +%s)"
docker compose exec -T mongo mongorestore --archive --gzip --nsFrom='pyprep.*' --nsTo="$restore_db.*" < "$archive"
collections="$(docker compose exec -T mongo mongosh --quiet "$restore_db" --eval 'db.getCollectionNames().length')"
if [[ ! "$collections" =~ ^[0-9]+$ ]] || (( collections == 0 )); then
  echo "Recovery check failed: restored database has no collections ($restore_db)." >&2
  exit 1
fi
echo "Recovery check passed: $collections collections restored to $restore_db."
