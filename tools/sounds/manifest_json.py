"""Écrit un manifest.json déjà mis en forme comme le fait Prettier (printWidth 100)."""

import json
import re

PRINT_WIDTH = 100
# Une liste de valeurs simples sur plusieurs lignes, telle que json.dumps(indent=2) l'écrit.
PRIMITIVE_LIST = re.compile(r'^( *)("[^"\n]*": )?\[\n((?: *(?:"[^"\n]*"|[-\d.eE]+|true|false|null),?\n)+) *\](,?)$', re.M)


def collapse(match):
    indent, key, body, comma = match.group(1), match.group(2) or "", match.group(3), match.group(4)
    items = [line.strip().rstrip(",") for line in body.splitlines()]
    one_line = f"{indent}{key}[{', '.join(items)}]{comma}"
    # Prettier ne garde une liste sur une ligne que si elle tient dans la largeur.
    return one_line if len(one_line) <= PRINT_WIDTH else match.group(0)


def dumps(data):
    return PRIMITIVE_LIST.sub(collapse, json.dumps(data, ensure_ascii=False, indent=2)) + "\n"
