# Acceptance checks — {{version}}

Automated tests and locale/build validation are in the source repository. Browser mocks do not prove real Obsidian integration. Test a copy of your Vault before replacing your working installation.

- Enable Dataview, JavaScript Queries and the CSS snippet. Open `{{folder}}/{{dashboardName}}` and confirm 3 calendars plus 1 numeric chart.
- Switch `language` between ru/en while keeping habits_folder/date_format. Verify labels, diagnostics, dialogs, weekday/month names, number labels and Help; habit names/units and all source files must remain unchanged.
- Open startup immediately after a new install/index refresh. If current note metadata is unavailable, the known context path should be used; unknown context should show a controlled message rather than guessing another active note.
- Previous stops at the oldest configured start month; Next stops at the current month. Add/remove an older habit and verify boundaries after indexing.
- Boolean Done/Not done changes one value; absent dates append consecutive list rows. Cancel/Escape and source links never write. Future/pre-start dates are disabled.
- Duplicate boolean dates remain visible with OR and diagnostics; the same date counts once. Only editing the duplicated date is blocked; other days work. Numeric duplicates continue to sum.
- Add 5, 5 and 20 on one numeric date: three rows and daily sum 30. Test zero, decimal comma/point, validation, chosen date, source links and all chart modes. Graph taps/clicks must do nothing.
- Verify data appears only after confirmed saving, without saving/saved banners or vertical jumps. Concurrent edits, duplicate clicks, moved files and failed writes must not overwrite history.
- Both `Journal` and `Журнал` headings are editable in both languages. Existing headings/comments/newlines must remain intact; a new journal uses the current language.
- Light/dark themes, narrow panel, keyboard and touch input, modal focus, 3/2/1 calendar columns, full-width graph with 190 px height and 11 px scale text.
- Disable network and confirm runtime functionality. Check real Dataview indexing after editing and reopening a note.
