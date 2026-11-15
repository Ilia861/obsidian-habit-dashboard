# Obsidian Habit Dashboard {{version}} — English by default

[Русская инструкция](README.ru.md)

1. Extract the contents of this ZIP into your Obsidian Vault, including the hidden `.obsidian` folder.
2. Enable the Dataview community plugin and **Enable JavaScript Queries** in its settings. No other plugin is required; runtime use is offline.
3. Enable `habit-dashboard` under Settings → Appearance → CSS snippets. If your Vault uses another settings-directory name, copy the CSS into that directory's `snippets` folder.
4. Open `{{folder}}/{{dashboardName}}` in Reading view or Live Preview.
5. Use **Help** at the top. Three example calendars and one numeric habit are included. Demo records cover October–November 2026; navigate to November 2026 if your current month differs.

The package is ready to use: no JavaScript edits, npm, internet access, extra translation patch or Node.js installation is needed in Obsidian.

## Switch language without moving data

Keep `habits_folder: "{{habitsFolder}}"` and your `date_format`; change only `language: en` to `language: ru`. Both translations and both Help files are bundled. Names, units, paths, YAML keys and history remain unchanged. The date format is independent of interface language.

## Update an existing installation

Back up your Vault. Replace your existing dashboard note with this version's dashboard code, and copy `Help.en.md`, `Help.ru.md` and `.obsidian/snippets/habit-dashboard.css`. Preserve your dashboard properties, especially `habits_folder`, `date_format` and `language`. An existing Russian installation should keep `habits_folder: "Привычки"`; do not point it at the English demo folder by mistake. You may keep your existing dashboard filename. Re-enable the CSS snippet and reopen the note.

**Do not overwrite your personal habit folder with demo files.** There is one package, with English defaults and both interface languages included. For an existing Vault, change the language property and preserve its existing folder setting instead.

For source, automated tests and build instructions, use the project repository/source ZIP. Real Obsidian acceptance checklists are in `docs/en/TESTING.md` and `docs/ru/TESTING.md` in the sources; build metadata stays outside the installation package.

The old duplicate `Habit Dashboard/Help.md` is no longer used; you may delete it after checking any personal links to it. Keep `Help.en.md` and `Help.ru.md`.
