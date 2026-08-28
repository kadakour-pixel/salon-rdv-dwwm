#!/usr/bin/env bash
#
# backend/scripts/backup-db.sh
# Sauvegarde quotidienne de la base MySQL en local, avec rotation.
#
# Complète les sauvegardes automatiques alwaysdata (limitées à 3 jours
# glissants sur le plan Free) en conservant des dumps compressés plus
# longtemps, dans $HOME/db-backups (hors du répertoire admin/backup géré
# par alwaysdata).
#
# Cron alwaysdata (Avancé → Tâches planifiées, une fois par jour) :
#   bash /home/kadakour/backend/scripts/backup-db.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"
BACKUP_DIR="$HOME/db-backups"
RETENTION_DAYS=14

mkdir -p "$BACKUP_DIR"

# Charge uniquement les variables DB_* du .env — jamais affichées ni loguées.
DB_HOST=$(grep -E '^DB_HOST='     "$ENV_FILE" | cut -d '=' -f2-)
DB_PORT=$(grep -E '^DB_PORT='     "$ENV_FILE" | cut -d '=' -f2-)
DB_USER=$(grep -E '^DB_USER='     "$ENV_FILE" | cut -d '=' -f2-)
DB_PASSWORD=$(grep -E '^DB_PASSWORD=' "$ENV_FILE" | cut -d '=' -f2-)
DB_NAME=$(grep -E '^DB_NAME='     "$ENV_FILE" | cut -d '=' -f2-)

TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
DUMP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

# MYSQL_PWD plutôt que --password=... en argument, pour éviter que le mot de
# passe apparaisse en clair dans la liste des process (ps aux) le temps de
# l'exécution.
export MYSQL_PWD="$DB_PASSWORD"

mysqldump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  --single-transaction \
  --routines \
  "$DB_NAME" | gzip > "$DUMP_FILE"

unset MYSQL_PWD

echo "Sauvegarde créée : $DUMP_FILE"

# Rotation : supprime les dumps de plus de RETENTION_DAYS jours.
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +"$RETENTION_DAYS" -print -delete