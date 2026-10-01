---
name: qa-card
description: QA a GitHub card end-to-end - move it through the GitHub Project (Ready to test -> In testing -> Done / In review), test it black-box in the testing environment, generate the standard test-case sheet, and leave the closing comment. Trigger when the user says "testea esto", "testea la card", "proba esto", "QA de la card", "test this card", pastes a GitHub issue link to test, or gives a card number to test.
---

# QA card workflow

The user is a QA tester. The process is the same for every system; only the system profile changes.
The human leads: confirm with the user before any outward-facing action (moving a card to its
final state, posting a comment, creating an issue). Talk to the user in their language.

Scripts live in `scripts/` next to this file (the skill base directory). First run:
`cd <skill dir>/scripts && npm install`.

## 0. First-time setup (only if `~/.qa-card/config.json` doesn't exist)
Ask ONE question at a time and save the answers to `~/.qa-card/config.json`
(shape: `examples/config.example.json`):
1. GitHub organization that owns the cards (e.g. `MyOrg`).
2. The tester's GitHub username (to assign cards). Verify with `gh api user --jq .login`.
3. Tester name as it goes in the sheet ("Apellido Nombre").
4. Optional: path to the org logo (png/jpg) for the sheet header.
5. Path to the organization's **Cypress runner repo** (where automations live) and its structure
   (spec folders, custom commands, selectors, fixtures). Save as `config.cypressRepo`.
Also check `gh auth status` shows the `project` scope; if not, tell the user to run
`! gh auth refresh -h github.com -s project` and to wait for "Authentication complete".

## 1. Inputs per card (ask for any missing one, one at a time)
1. **Issue link** (GitHub card).
2. **Credentials** for the testing environment, **one per role** (chat only; pass as env vars; NEVER write them
   to disk or memory). Roles change permissions, catalogs and views: confirm which role the card belongs
   to and test with it; a missing option/permission with the wrong role is NOT a bug.
3. **Link to the system's "Casos de prueba" workbook** (OneDrive/SharePoint) — for the closing comment.
If the system (repo) is new in `config.systems`, also ask: testing front URL, API URL, sheet prefix
(e.g. `BP`), system title for the sheet header. Save them under `config.systems[<repo>]`.
**Repos (always ask, never infer from the card or local folder names)**: front repo, back repo,
repo where QA cards/bug issues go, and the default repo for bugs when it's unclear which side failed
(an HTTP 4xx/5xx from the API usually belongs to the back). Core/smoke suites have NO card, so the
repo must come from the system profile, not from `card-<n>`. Save them in the profile and in the
runner's system registry if it has one.
If Engram is available, also save/read the system's structure there (project `qa-<org>`).

## 2. Read the card and move it to "In Testing"
```bash
gh issue view <n> -R <org>/<repo> --json title,body,comments,projectItems
```
Move the card. Look up ids once per project and cache them in `config.systems[<repo>].project`:
```bash
gh project list --owner <org> -L 100 --format json               # number + id by title (projectItems[].title)
gh project field-list <num> --owner <org> --format json          # Status field id + option ids
gh project item-list <num> --owner <org> --format json -L 1000 --jq '.items[] | select(.content.number==<n>)'
gh project item-edit --id <itemId> --project-id <projectId> --field-id <statusFieldId> --single-select-option-id <optionId>
```

## 3. Plan cases from the card
- Derive cases from the card's "Probar"/acceptance list. Only the essentials; don't over-dig.
- Prefer data that discriminates (e.g. non-sequential values) so before/after is visible.
- Always create NEW test data; old data can legitimately differ after a change.
- Read the user's previous comments/issues when unsure of conventions (`gh search issues --author <user> --owner <org>`).

## 4. Test (black-box, testing environment) — WITH CYPRESS
Write the automation in **Cypress** inside `config.cypressRepo`, following its existing structure
(read it first: spec folders, `cypress/support/commands`, selectors, fixtures) so the run reaches the
team's reports. Default layout if none exists:
- Spec: `cypress/e2e/<core|features>/<system>/[<view>/]card-<n>-<name>.cy.js` (1st folder = suite type,
  2nd = system, optional 3rd = view, `card-<n>-` = card).
- If the runner has a system registry (e.g. `config/systems.json` mapping system → card repo), add ONE
  line for a new system so reports link the card. Never fall back to another system's repo.
- Reusable steps as custom commands in `cypress/support/commands/<system>.actions.js`, selectors in
  `cypress/support/selectors/<system>.selectors.js`, data in `cypress/fixtures/<system>.json`.
- API checks/snapshots with `cy.request` (before/after state). Credentials only via env files that are
  gitignored — never in specs or fixtures.
- Run with the repo's scripts (prefer a local/no-publish profile while developing), or
  `npx cypress run --spec <path>`.
- Once green, publish the run to the team's reports dashboard if the repo supports it (usually behind an
  explicit opt-in flag) and, with the user's OK, link the run in the card comment.
- A run that failed because of an automation bug (false failure) must not stay as evidence: tell the
  user before deleting or invalidating it.
- Commit on a branch `qa/card-<n>` and follow the repo's delivery rule (PR or push, ask the user).
- `scripts/api.js` (Node) remains available for quick API reads outside Cypress.
- Ask the user at key moments: permission blockers, ambiguous behavior, anything that looks like a
  business rule. What the dev confirms as design is EXITOSO (save it as a known rule).
- Screenshots ONLY when there is a bug (Cypress `cy.screenshot()`). Save them to the output folder.

## 5. Document: standard sheet
Write `cases.json` (format: `examples/cases.example.json`) and run:
```bash
node <skill dir>/scripts/build-sheet.js cases.json     # -> <outDir>/Caso de Prueba - <PREFIX> - <n>.xlsx
```
The user copies the sheet into the system's workbook. Rules:
- Sheet name `<PREFIX> - <issue number>`; Tipo `Funcional`, Ciclo `1`, date d/m/yyyy (defaults).
- EVERY cell SHORT (5-10 words). No ids or technical detail.
- Resultados: `EXITOSO` / `FALLIDO` / `NO EJECUTADO`. Observaciones: one line, default `No hay observaciones`.
- **Link de Issue always empty** (the user fills it).

## 6. Verdict and close (with the user's OK)
- Propose Done or In review with a one-line reason and wait for confirmation.
- Assign the card to the tester: `gh issue edit <n> -R <org>/<repo> --add-assignee <githubUser>`.
- Post with `gh issue comment <n> -R <org>/<repo> --body-file <file>`, then move the Status.
- **Done** — comment exactly:
  ```
  Se realizó el Testing

  Muevo tarjeta a 'Done'

  Adjunto [Casos de prueba](<casesLink>)
  ```
  After moving, check the issue state; if it is still open, ask before closing it.
- **In review** — `Muevo tarjeta a 'In Review'` + the bug report below. The user drags the
  screenshot in (the GitHub API can't attach images). Also give the user a more technical version
  for the developer.
- Tell the user to check the card.

## Bug report structure (In review comments AND new bug issues)
```
**Descripción:**
<what happens, 1-2 lines, in user terms>

**Comportamiento actual:**
* <observed behavior>

**Comportamiento esperado:**
* <expected behavior>

**Pasos para reproducir:**
1. Ir a <sección>.
2. <acción>.
3. Observar que <resultado incorrecto>.

**Impacto:** (optional)
**Posible causa:** (optional, only if verified)
**Verificación:** (optional, if checked via API/DB)
**Sugerencia de solución:** (optional)
```
New issues: title `<PREFIX> - <short summary>`, label `bug`. Show the draft and create only with
the user's OK: `gh issue create -R <org>/<repo> --title "<t>" --body-file <file> --label bug`
(ask who to assign).

## 7. Save knowledge
If Engram is available, save to project `qa-<org>`: card result, new system structure, dev-confirmed
rules, user preferences. Otherwise keep system data in `~/.qa-card/config.json`. Never credentials.
