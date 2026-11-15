# Publish one bilingual repository / Публикация общего репозитория

## English

1. Create a GitHub repository and choose its visibility and license. This source bundle does not select a license or grant additional reuse permissions on the owner's behalf.
2. Upload/commit the source tree at the repository root on `main`, including `.github/`, `src/`, `locales/`, `docs/`, `scripts/`, `tests/`, `examples/` and package.json. Do not commit the generated `dist/` or personal Vault files. No GitHub owner/remote is hardcoded in this project.
3. Enable GitHub Actions. `ci.yml` runs tests/builds for main pushes, pull requests and manual runs using Node 22/24. Download the ready-to-use ZIP from its artifact to inspect them.
4. Complete the real Obsidian checks from `docs/en/TESTING.md` on both languages and on your existing Russian logs.
5. Set package.json's version, update documentation/release notes as needed, then push a matching version tag such as `v1.4.1`.
6. `release.yml` validates the tag, runs the complete build/tests and uses GitHub CLI to create a **draft** release with the unified install ZIP and SHA256SUMS. Review its contents, notes and validation results, then publish manually in GitHub Releases. Existing releases are not silently overwritten on rerun.

The workflows use `GITHUB_TOKEN`, not a personal access token. CI has read-only repository permission; the tag-only draft-release workflow requests contents:write. Organizational restrictions may require enabling these workflow permissions. Hosted GitHub runners provide GitHub CLI. No live workflow/release was run by this local source preparation.

## Русский

1. Создайте репозиторий, выберите видимость и лицензию. Архив исходников сам не выбирает лицензию за владельца.
2. Разместите исходное дерево в корне `main`, включая скрытую `.github`. Генерируемый `dist/` и личные заметки не коммитьте. Аккаунт и адрес remote не зашиты в проект.
3. Включите GitHub Actions: CI проверяет main/PR/ручной запуск на Node 22/24 и прикладывает единый ZIP для проверки.
4. Пройдите реальную приёмку в Obsidian по `docs/ru/TESTING.md` для обоих языков и существующей русской истории.
5. Задайте версию в package.json, при необходимости обновите документацию и заметки релиза, отправьте совпадающий тег, например `v1.4.1`.
6. Workflow релиза проверяет тег и тесты и создаёт **черновик** с единым архивом и SHA256. Проверьте его и опубликуйте вручную. Повторный запуск не перезаписывает существующий релиз молча.

CI использует чтение репозитория, workflow релиза на теге — contents:write и штатный GITHUB_TOKEN. Публикация через GitHub требует доступного репозитория и разрешений его владельца. Локальная подготовка исходников не запускала workflow в GitHub.

References: [Node.js CI](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs), [workflow triggers](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow), [GitHub releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository).
