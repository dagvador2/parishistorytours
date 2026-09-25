#!/usr/bin/env bash
# Delete the " 2" copies iCloud leaves behind when it sees a file written twice
# (~/Desktop is synced, so a build is enough to trigger it). Those copies are
# always stale snapshots of a file that has since moved on in git.
#
# Safety net: anything git tracks is left alone and reported. If a real file is
# ever named "... 2.ts", commit it first and this script will refuse to touch it.
#
#   pnpm clean:dups          delete them
#   pnpm clean:dups --dry    list them without deleting
#
# Written for the bash 3.2 that ships with macOS: no mapfile, no arrays.
set -eu
cd "$(dirname "$0")/.."

DRY=""
[ "${1:-}" = "--dry" ] && DRY=1

list=$(mktemp)
trap 'rm -f "$list"' EXIT
find . \( -path ./node_modules -o -path ./dist -o -path ./.git \) -prune \
  -o \( -name '* 2' -o -name '* 2.*' \) -print | sort > "$list"

total=$(grep -c . "$list" || true)
if [ "$total" -eq 0 ]; then
  echo "Aucun doublon iCloud."
  exit 0
fi

deleted=0
while IFS= read -r f; do
  [ -n "$f" ] || continue
  if git ls-files --error-unmatch "${f#./}" >/dev/null 2>&1; then
    echo "  SUIVI PAR GIT, ignoré : $f"
    continue
  fi
  if [ -n "$DRY" ]; then
    echo "  $f"
  else
    rm -rf -- "$f"
    deleted=$((deleted + 1))
  fi
done < "$list"

if [ -n "$DRY" ]; then
  echo "$total doublon(s) trouvé(s), rien supprimé (--dry)."
else
  echo "$deleted doublon(s) supprimé(s)."
fi
