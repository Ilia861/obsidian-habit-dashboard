# Help — Habit Dashboard {{version}}

## Change language

**Русский интерфейс:** в свойствах `{{dashboardName}}` установите `language: ru`.

[Open the dashboard]({{dashboardName}})

Habit notes may be renamed, including Russian filenames such as `Чтение.md`, within `{{folder}}/{{habitsFolder}}/`. The dashboard label is set by **`habit_name`** (for example, `habit_name: Чтение`); renaming the file alone does not change that label. Keep **`habit_id`** unchanged: it is the stable identifier. The interface language does not translate habit names or units automatically. The `unit` field sets a numeric habit’s unit label.

## Add a habit

1. Create a Markdown file in `{{folder}}/{{habitsFolder}}/`.
2. Copy a template below and choose a unique `habit_id`.
3. Set the name, type, start date and integer display order. Save the file and wait for Dataview indexing.

Boolean habit:

```markdown
---
habit_id: swimming
habit_name: Swimming
habit_type: boolean
start_date: 2026-11-01
order: 5
---

## Journal

- [date:: 2026-11-01] [value:: true]
- [date:: 2026-11-02] [value:: false]
```

Numeric habit:

```markdown
---
habit_id: books
habit_name: Reading books
habit_type: number
unit: pages
start_date: 2026-11-01
order: 10
---

## Journal

- [date:: 2026-11-01] [value:: 15]
- [date:: 2026-11-02] [value:: 2.5]
- [date:: 2026-11-03] [value:: 0]
```

Use one date/value pair per list item, all on one line. Actual records must not be inside a code block. Stored dates always use `YYYY-MM-DD`; stored numbers use a decimal point. Boolean values are unquoted lowercase `true` or `false`. Numeric values must be finite and nonnegative.

| Property | Required | Meaning |
|---|---|---|
| `habit_id` | Yes | Unique nonempty text identifier |
| `habit_name` | Yes | Display name; changing it does not change history |
| `habit_type` | Yes | `boolean` or `number` |
| `start_date` | Yes | First tracked date, e.g. `2026-11-01` |
| `order` | Yes | Integer; smaller values appear first |
| `unit` | For number | Nonempty measurement unit, e.g. `pages` |

Only direct children of the configured habits folder are scanned. Boolean calendars appear first, numeric charts second. Each group sorts by order, then name, then file path. The habit title opens its source note. Rename files within Obsidian to retain normal link handling. Before deleting a habit, back up its file; delete it or move it outside the configured habits folder to remove its card.

## Language, dates and storage

Edit these dashboard properties (keep your existing properties in the same YAML block):

```yaml
language: en
date_format: "YYYY-MM-DD"
habits_folder: "{{habitsFolder}}"
cssclasses:
  - habit-dashboard-page
```

`language: ru` or `language: en` changes the interface, messages and Help link. It does not translate your habit names or units, rename files, or change their content. **Keep `habits_folder` and `date_format` when switching language.** The folder is relative to the dashboard note and is independent of language. Paths use `/`; a leading slash, backslashes, empty segments and `.` / `..` are rejected. If omitted, the unified package uses `Habits` regardless of interface language. When updating an older Russian installation, explicitly keep `habits_folder: "Привычки"`.

`date_format` is independent of language. Supported examples: `DD:MM:YYYY`, `DD.MM.YYYY`, `DD/MM/YYYY`, `YYYY-MM-DD`, or another order using each uppercase token exactly once and the same separator from `: . / -`. Invalid settings show a warning and fall back to ISO display. Stored dates never change. Number labels follow the interface language, while stored numbers always use a point.

Both `## Journal` and `## Журнал` are recognized regardless of interface language. Existing headings remain unchanged; a newly created journal uses the current language. Multiple journal sections are ambiguous and must be corrected manually. The package includes exactly two Help files: `Help.en.md` and `Help.ru.md`. The dashboard opens the file matching its interface language.

## Mark a calendar day

Click a date and choose **Done**, **Not done**, or **Cancel**. Today and earlier dates from the start date are editable; future and pre-start days are disabled. Escape cancels. The dialog's **Open habit file** link opens the source in a new tab without saving.

An existing record changes only its boolean value. A missing date appends a compact list row; old comments, whitespace and history are not reformatted. Nothing is written when viewing the dashboard or cancelling. A cell changes only after the file operation succeeds, without waiting for Dataview and without inserting status banners. If it does not change, inspect the source manually. Repeated input for the same habit is blocked while saving.

Duplicate boolean dates remain visible, with expanded diagnostics showing line numbers. Display and statistics use **OR**: any `true` marks the day as done, and a date counts once. Only editing the duplicated date is blocked until you keep one record manually; other dates remain editable. No automatic deduplication occurs.

## Add a numeric record

Use **Add record** in the numeric card; clicking or tapping the chart performs no action. The date defaults to today even when viewing an older month. Quantity starts blank and shows the habit's unit. Zero and nonnegative fractions with a point or comma are accepted, e.g. `5`, `0`, `2.5` or `2,5`. Future and pre-start dates are not accepted. The date picker may follow your system format; the formatted date is also shown below it.

The preview shows the existing day total and the proposed addition. **Add** (or Enter in the quantity field) always appends a new row; Cancel/Escape does not write. Three additions of 5, 5 and 20 create three records and a daily total of 30. This is true in every chart mode: the input is a contribution, never a replacement total or average. Correct mistaken entries manually in the source file.

Graphs and statistics update only after confirmed saving. The chosen month and chart mode remain selected. If the added date belongs to another month, switch to that month to see it. No saving/saved banners move the cards. Concurrent edits, moved files or ambiguous Markdown prevent saving rather than overwriting your changes; inspect the source and reopen the dialog.

## Read the dashboard

- Previous stops at the earliest configured start month; Next stops at the current month. An empty/invalid/future-only set stays in the current month. Boundaries update after indexing when habits are added or removed.
- Accent with ✓ means done, × means missed, dotted means today is pending, muted means before start or future. Today is outlined. Hover over days or points for details.
- Completion means `true` or a numeric daily sum above zero. Missing completed days are missed. Today without a record preserves the streak through yesterday; an explicit false/zero breaks it immediately. Current missed days include only completed days, and a success today resets them.
- Longest streak and all-time counts use actual today, independent of the selected month. Monthly counts count unique completed dates. Numeric cards also show sums.
- Daily mode shows daily totals. A recorded zero is a point at zero; no observation is a gap.
- Cumulative mode starts from zero each selected month; missing observations remain gaps, later points include earlier contributions.
- The 7-day average uses the selected day plus six preceding calendar days, including the previous month. Missing days and pre-start days contribute zero; the divisor is always 7. Missing observations remain gaps; explicit zero remains an observation with its transformed average.

Labels round to two decimal places; calculations use JavaScript number precision. Graph height stays 190 px, scale text 11 px. Calendars use 3 columns from 628 px of content width, 2 from 408 px, and 1 below that. Sidebar widths and zoom matter more than screen resolution. The note-specific CSS class provides 32 px side margins without changing other notes.

## Troubleshooting

| Problem | Check |
|---|---|
| No card | Folder setting, YAML, required properties, diagnostics |
| Missing data | One date/value pair per list line, ISO date, correct value type |
| Blank chart | Habit type, selected month, start date, diagnostics |
| Wrong layout | Enable the `habit-dashboard` CSS snippet |
| Evaluation error | Enable Dataview JavaScript Queries; use Reading view or Live Preview |
| Changes not visible | Wait for indexing, reopen the note; restart Obsidian if necessary |
| Duplicate date warning | Open the linked file and keep one boolean record per date manually |
| Conflicting habit_id | Give each file a unique ID; histories are never merged |
| Startup indexing message | Wait and reopen; the dashboard will not guess another active note's path |

Malformed or ambiguous records are not auto-corrected. Updates never require renaming your habit files. Back up your Vault and replace interface files only; never extract demo habits over your personal notes.
