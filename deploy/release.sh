#!/usr/bin/env bash
# Runs ON THE SERVER (uploaded and started by .github/workflows/deploy.yml).
#
# Unpacks a release built by GitHub Actions, switches the `current` symlink to it,
# restarts the service and checks that the site answers. If it does not, the previous
# release is put back.
#
#   usage: release.sh <archive.tgz> <release-name>
#
# Layout under $APP_DIR (default ~/cgsongbook-app):
#   .env                  runtime settings (DB_URL, SESSION_SECRET, STT_KEY, ...), never deployed
#   releases/<name>/      one directory per release (server.js, .next, public, node_modules)
#   current -> releases/<name>
set -euo pipefail

ARCHIVE="$1"
RELEASE="$2"

APP_DIR="${APP_DIR:-$HOME/cgsongbook-app}"
SERVICE="${SERVICE:-cgsongbook}"
PORT="${PORT:-3001}"
KEEP_RELEASES="${KEEP_RELEASES:-3}"

RELEASE_DIR="$APP_DIR/releases/$RELEASE"
# The release that is live right now (empty on the very first deployment)
PREVIOUS=""
if [ -L "$APP_DIR/current" ] && [ -e "$APP_DIR/current" ]; then
    PREVIOUS="$(readlink -f "$APP_DIR/current")"
fi

is_healthy() {
    # the login page of the editor needs neither the database nor a session
    for _ in $(seq 1 20); do
        if [ "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/editor" || true)" = "200" ]; then
            return 0
        fi
        sleep 1
    done
    return 1
}

echo "Unpacking $RELEASE ..."
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
tar -xzf "$ARCHIVE" -C "$RELEASE_DIR"
rm -f "$ARCHIVE"

echo "Switching to $RELEASE ..."
ln -sfn "$RELEASE_DIR" "$APP_DIR/current"
sudo systemctl restart "$SERVICE"

if is_healthy; then
    echo "Release $RELEASE is live."
else
    echo "Release $RELEASE does not answer on port $PORT." >&2
    if [ -n "$PREVIOUS" ] && [ -d "$PREVIOUS" ] && [ "$PREVIOUS" != "$RELEASE_DIR" ]; then
        echo "Rolling back to $(basename "$PREVIOUS") ..." >&2
        ln -sfn "$PREVIOUS" "$APP_DIR/current"
        sudo systemctl restart "$SERVICE"
    fi
    exit 1
fi

# Keep only the newest releases
cd "$APP_DIR/releases"
ls -1t | tail -n +"$((KEEP_RELEASES + 1))" | while read -r old; do
    echo "Removing old release $old"
    rm -rf -- "$old"
done
