# Obsidian Habit Dashboard

[Русский README](README.ru.md) · [English Help](docs/en/Help.md) · [Publishing](docs/PUBLISHING.md)

An offline habit dashboard for Obsidian Desktop, using **Dataview only**, SVG and a CSS snippet. One shared implementation provides Russian and English interfaces. No translation patch or additional chart plugin is required.

## Install

Download `habit-dashboard-v1.4.1.zip`: one package with English defaults and Russian built in. Extract its contents into your Obsidian Vault, including the hidden `.obsidian` folder, enable Dataview JavaScript Queries and the `habit-dashboard` CSS snippet, then open `Habit Dashboard/Dashboard.md`. The ZIP includes detailed instructions, both Help languages, 3 example calendars and 1 numeric tracker.

The GitHub-generated **Source code** archive is for development; build it first using the commands below.

## Language and data safety

```yaml
language: en
date_format: "YYYY-MM-DD"
habits_folder: "Habits"
cssclasses:
  - habit-dashboard-page
```

Change only `language` to switch UI languages. **Keep your existing habits_folder and date_format.** Russian installations retain `Привычки`; English installations retain `Habits`. Switching language does not rename files, translate personal habit names/units, or modify history. Existing Russian notes with `## Журнал` and English notes with `## Journal` work in either UI language. Stored keys stay `habit_id`, `habit_type`, `start_date`, `date`, `value`, etc.; dates stay ISO and numbers use a point.

For an existing Vault, back up first and replace the dashboard, both `Help.ru.md` / `Help.en.md` and CSS. Preserve your dashboard properties and personal habit files. Do not extract demos over existing journals. No data migration is needed.

## Features

- Responsive 3/2/1-column calendars; theme-aware colors and note-specific margins.
- Click a calendar day: Done, Not done, Cancel. Duplicate dates remain visible with OR and diagnostics; only editing that duplicated date requires manual cleanup.
- Numeric Add record button with date, nonnegative quantity, fractions and explicit zero. Repeated dates append separate rows and sum. The graph has no click/tap action.
- Daily, monthly cumulative and 7-calendar-day average charts; missing observations remain gaps, while recorded zero stays an observation. Graph height 190 px and scale text 11 px remain constant.
- Streaks, unique completion counts and numeric sums. Historical month selection does not change all-time/current statistics.
- Month navigation bounded by the earliest valid start month and current month.
- Confirmed-only updates, no layout-shifting save banners, compact log rows, concurrent-edit protection, and manual source access.

## Develop and build

Node.js **22 or newer** is needed for development only. There are **no npm dependencies**, so no install step is needed.

```sh
npm run validate:locales
npm test
npm run build
```

`npm test` validates translation keys/placeholders, builds the unified package plus a legacy Russian compatibility fixture, and runs regression/localization/package tests. `npm run build` builds only the English-default install package. `dist/` contains one install ZIP, SHA256 checksums, release notes and the extracted `en/` tree; tests additionally create `ru/` as an internal fixture, never a second release ZIP. `dist/BUILD.json` (outside the install ZIP) records the shared-source hash. ZIP generation is deterministic and uses Node built-ins.

```text
src/                 Shared calculations, editor, view, i18n and CSS
locales/             ru.json and en.json
examples/            One canonical demo history with localized labels
scripts/             Validation, packaging and test commands
tests/              Regression, localization and package tests
docs/ru/ + docs/en/  Help and installation/acceptance templates
.github/workflows/   CI and draft-release automation
```

Documentation templates use `{{...}}` values; builds fill them with actual package paths and version. The unified package supports both languages offline. Help starts with switching instructions. Rename habit files freely inside their configured folder; `habit_name` controls the displayed name, while `habit_id` remains stable.

## GitHub workflow

Use `main` as the shared branch. Feature branches are temporary; there are no permanent language branches. CI tests on Node 22/24 and uploads the single install ZIP as an artifact. Pushing a tag matching `package.json`, e.g. `v1.4.1`, builds/tests and creates a **draft** release containing the install ZIP and checksums. See [publishing instructions](docs/PUBLISHING.md).

## Verification and scope

[English acceptance checklist](docs/en/TESTING.md) · [Русская приёмка](docs/ru/TESTING.md) · [Validation report](VERIFICATION.md)

Mocked tests do not replace real Obsidian checks for indexing, file APIs, themes, native date pickers and touch input. Categories and custom non-daily activity periods are planned discussion topics, not implemented in this version.

A project license has not been selected; choose one before offering reuse permissions in a public release.
