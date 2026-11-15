# 1.4.1

- One English-default installation ZIP with both languages included.
- First-line switching instructions in both Help files.
- Document Russian filenames, `habit_name`, stable `habit_id`, and independent data paths.
- Preserve Russian legacy compatibility fixtures internally without a separate Russian release archive.

# Changelog

## 1.4.0

- One shared source implementation and 106 validated RU/EN translation keys.
- `language` controls UI independently of date_format and habits_folder.
- Both journal headings work with either language; existing files are not translated or renamed.
- Two deterministic install ZIPs from the same source, localized demos, bilingual Help, SHA256 and shared-source manifests.
- GitHub CI and a version-tag workflow that prepares a draft bilingual release.
- Retains the 1.3.5 behavior: safe startup, bounded months, visible OR duplicates, compact record rows, numeric append/sum input, confirmed-only quiet updates, constant chart height and theme-aware layout.

Earlier development artifacts are retained outside this repository; current behavior and upgrade instructions are in README/Help.
