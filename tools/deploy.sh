#!/bin/bash
# Publikacja: testy -> budowa -> commit -> wypchnięcie na gałąź dev. Na GitHubie testy uruchamiają się ponownie
# i dopiero po ich zaliczeniu zmiana trafia na main (strona). Użycie: tools/deploy.sh "opis zmiany"
set -euo pipefail
cd "$(dirname "$0")/.."
[ -n "${1:-}" ] || { echo 'Podaj opis zmiany'; exit 1; }
node tests/app.test.js
node tests/collide.js
python3 tools/build.py src/dziennik-silowy.html .
git add -A
git commit -q -m "$1" || echo 'Brak zmian do zapisania'
git push -q origin HEAD:dev
echo 'Wysłano na dev. Strona zaktualizuje się po zaliczeniu testów na GitHubie.'
