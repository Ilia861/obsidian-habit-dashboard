# Verification / Проверки — v1.4.1

`npm test`: **134 passed**, no failures or skipped tests.

Coverage: calculations and dates (28), boolean editing (18), Russian interface/navigation (49), English interface/language switching (9), localization (10), numeric editing (15), packaging (5).

The release contains exactly one English-default installation ZIP with both translation catalogs and both Help files. Packaging tests check localized language-switch headings and instructions, naming fields, three boolean demos, one numeric demo, default English properties, identical shared logic in the legacy compatibility fixture, deterministic output and checksums. The legacy Russian tree is an internal test fixture, not a second release package.

The installation and source ZIPs passed independent Python zipfile CRC checks. GitHub workflow YAML was parsed locally.

## Real-environment checks / Проверки в реальной среде

This version was not run inside Obsidian here. Follow docs/en/TESTING.md or docs/ru/TESTING.md for native writes, Dataview refresh, links, theme/layout and touch checks. GitHub Actions were not run remotely and no repository/release was published.

Все 134 автоматических теста пройдены. Выпускается один пакет, английский по умолчанию; русский включается свойством language. Отдельный русский ZIP больше не создаётся. Проверки с настоящим Obsidian и запуск workflow на GitHub остаются для приёмки; чек-листы включены.
