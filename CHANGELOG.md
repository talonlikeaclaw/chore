# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
While the version is below `1.0.0`, a minor release may include behavior changes;
those are called out under **Changed**.

## [0.8.1] - 2026-10-04

### Added

- `/household`'s `Email notifications` section has a `Send test email` button:
  it mails the household's digest to your own address on demand, so SMTP can be
  checked without waiting for the weekly slot. The subject is marked `[Test]`,
  and the send writes nothing — the schedule and `digest_last_sent_on` are left
  alone, and it works while the household digest is off.

## [0.8.0] - 2026-10-04

### Added

- **Weekly digest email.** `/household` gains an `Email notifications` section
  with `Send a weekly chore digest to members`, a household-local weekday
  (`Send on`) and hour (`Send at`), plus `Email me the weekly digest` for your own
  inbox. Both switches apply as you click them — the section has no Save button —
  and the personal one is disabled with `Weekly digest is off for this household.`
  until the household switch is on. The email lists the chores due in the next 7
  days, grouped by room, using the dashboard's own `Overdue · …` / `Due today` /
  `Due …` wording, and links back to `/dashboard`.
- Mail goes over SMTP through `nodemailer`, configured by `SMTP_HOST`,
  `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURE` and `MAIL_FROM` — one
  code path covers Resend (`smtp.resend.com:465`), Mailgun, Postmark, a Gmail app
  password and a local relay. `SMTP_USER`/`SMTP_PASSWORD` may stay empty for an
  unauthenticated relay, and `SMTP_PORT=465` implies TLS.
- An in-process scheduler ticks every 15 minutes and sends whichever households
  have crossed their local slot, so there is no sidecar and no cron to install.
  `DIGEST_SCHEDULER=off` disables it. Each send records the slot's civil date on
  the household, so restarts and repeated ticks cannot double-send, and a run
  whose every send failed leaves the slot open for the next tick to retry.
- A digest is skipped when nothing is due in the window or every recipient has
  opted out — no "nothing due" mail, and the slot is still consumed. With
  `SMTP_HOST` unset the digest is off and `/household` says how to enable it.

## [0.7.3] - 2026-10-03

### Changed

- The chore row is three tiers: title (the chore name, then the room chip on the
  `Due soon` panel), then the cadence with `Last done by …`, then the due/overdue
  badge on its own bottom line. The badge no longer shares a wrapping line with
  the chore name, so the cadence and last-done stop shifting when a badge
  changes width, and the row has room for both at every breakpoint.

### Fixed

- `/dashboard` no longer lets its last element (`Add room`, or the add-room
  input) touch the version footer. The dashboard layout's
  `pb-[env(safe-area-inset-bottom)]` replaced `py-6`'s bottom padding with the
  home-indicator inset — `0` on desktop — so the page had no bottom padding at
  all; the inset is now added on top of it.

## [0.7.2] - 2026-10-03

### Changed

- `/history` reads summary → trend → detail: totals, `By member`, `By room`,
  `Last 8 weeks`, then `Cadence` (previously last-but-one) and `Recent
  completions`, so the trend chart is no longer buried under one row per chore.
  Cadence is a collapsible list (open by default) whose trigger shows the chore
  count.
- The completion log on `/history` has a `Recent completions` heading.
- `/dashboard` shows the household name and the invite button above the `Due
  soon` panel instead of below it.

## [0.7.1] - 2026-10-03

### Fixed

- Cleared the two remaining eslint warnings: the unused `isDragging`
  destructure in `room-section.tsx` and a stale `eslint-disable` directive in
  `pages/api/socketio.ts`. `npm run lint` is now silent.
- Pinned the CI runner to `ubuntu-24.04` so the October 2026 `ubuntu-latest`
  migration to Ubuntu 26 is opt-in.

## [0.7.0] - 2026-10-03

### Added

- **CI** (`.github/workflows/ci.yml`, Node 24): every push to `main` and every
  `v*` tag runs `test:run`, `lint`, `tsc --noEmit` and `build`; tags
  additionally build the `runner` image and push
  `ghcr.io/talonlikeaclaw/chore:<tag>` and `:latest`.

### Fixed

- The three test files that relied on Vitest globals now import
  `describe`/`it`/`expect`, so `npx tsc --noEmit` is clean.

## [0.6.0] - 2026-10-03

### Added

- Household preferences on `/household`: **week start day**, **12/24-hour
  time**, **date format** (US `Oct 3` / International `3 Oct`), and a
  **default chore interval** that prefills the add-chore count (the form still
  opens on "Days"). New columns `household.week_starts_on`,
  `household.hour_cycle`, `household.date_format`,
  `household.default_interval_days` (migration
  `0007_handy_molecule_man.sql`), the member-editable
  `updateHouseholdPreferences` action, and `src/lib/preferences.ts`.
- **Version visibility**: a build/runtime `APP_VERSION` (falling back to
  `dev`) rendered in the global footer and returned by `GET /api/health`.
  `docker-compose.yml` passes `APP_VERSION` as a build arg
  (`APP_VERSION=$(git describe --tags) docker compose up --build -d`).

### Changed

- The `/history` weekly trend starts on the household's week-start day, history
  day/week labels follow the date format, and log times follow the 12/24-hour
  choice. Defaults (Monday weeks, 24-hour, US dates) leave existing households
  unchanged; `date_format` only swaps the `Intl` formatter and never affects
  due-date math.
- `formatDueDate` takes a `DateFormat`; `getWeeklyTrend` and `getHistoryLog`
  take an options object instead of trailing positional arguments.
- The README's "Subsequent deploys" section now deploys a tagged release
  (`git fetch --tags && git checkout <tag>`) instead of `git pull`.

## [0.5.0] - 2026-10-03

### Added

- Chore recurrence beyond "every N days": **every N weeks on a weekday**
  (e.g. every second Saturday) and **every N months on a day of the month**
  (clamped to the target month's last day). New columns `chore.recurrence`,
  `chore.recurrence_interval`, `chore.recurrence_weekday`,
  `chore.recurrence_month_day` (migration `0006_opposite_killraven.sql`). The
  next due day is always strictly after the last completion's local civil day.
- `src/components/recurrence-fields.tsx`: one controlled recurrence field set
  (unit, count, weekday, month day) shared by the add-chore and edit-chore
  forms, with Enter to save and Escape to cancel.
- Due-date presentation: badges and row labels read civil dates
  ("Due Sat, Oct 10", "Overdue · Fri, Oct 2") and the cadence
  ("Every 2 weeks on Saturday"), instead of "Due in Nd" / "Nd overdue".
- A collapsible **Due soon** panel above the rooms on `/dashboard`, bucketing
  every active chore into Overdue / Today / This week (the next 7 days), sorted
  by due date, each row labelled with its room. Chores further out are omitted.
- `src/lib/chores.ts` now also exports `weekly`/`monthly`-aware `getDueDate`,
  `normalizeRecurrence`, `describeRecurrence`, `getTargetDays`, `getDueBucket`,
  `formatDueDate` and `WEEKDAY_NAMES`; `src/app/dashboard/types.ts` holds the
  shared `Chore`/`Room` view types that used to be declared in three files.

### Changed

- The `/history` cadence rows read in words instead of `every 13.0d vs 14d
  target`: each row shows its schedule ("Every 2 weeks on Saturday"), a verdict
  ("On schedule" / "3 days late" / "1 day early") and the actual mean
  ("usually 13 days apart"). A verdict is only called out when it clears the
  tolerance — half a day, or 5% of the target, whichever is larger.
- A monthly cadence is measured against the mean Gregorian month
  (365.2425 / 12 ≈ 30.44 days) rather than a flat 30, so a punctual monthly
  chore no longer reads as perpetually late.
- `createChore` / `updateChore` take a normalized `ChoreRecurrence` object
  instead of a bare `interval_days`. `interval_days` is unchanged and is read
  only when `recurrence = 'days'`; existing chores keep their interval and
  become `recurrence = 'days'`, so deployed due dates do not move.
- `/history`'s cadence target is derived from the recurrence (7 days per week,
  the mean Gregorian month per month) instead of `interval_days` alone.
- Deleting a chore or a room now carries the recurrence fields in its undo
  payload, so undoing restores the exact cadence.

## [0.4.0] - 2026-10-02

### Added

- Member management on `/household`: a member list with roles, transfer
  ownership, remove a member, and regenerate the invite code (all owner-only
  except the list).
- One-click household switch from `/join/[inviteCode]`: switching from a solo
  household deletes it (cascading its rooms and chores), otherwise it leaves the
  current household — then joins the target.

### Changed

- A user now belongs to exactly one household: `household_member.user_id` is
  UNIQUE (migration `0005_last_glorian.sql`, which dedupes any existing
  duplicates and promotes an owner where one was missing). Previously a user
  with two memberships rendered an arbitrary household.
- `leaveHousehold` auto-transfers ownership to the longest-standing remaining
  member when the owner leaves; `deleteHousehold` is owner-only and requires
  typing the household name to confirm.

## [0.3.0] - 2026-10-02

### Added

- `/history` page: lifetime / 7-day / 30-day completion totals, per-member and
  per-room counts, actual-vs-target cadence per chore, an 8-week trend, and the
  most recent 100 completions grouped by household-local day. Statistics are
  computed in `src/lib/history.ts`; the page is read-only and refreshes over
  Socket.io like the dashboard.
- History button in the dashboard header, next to the account button.

## [0.2.0] - 2026-10-02

### Added

- Household timezone: `household.timezone` (IANA string, migration
  `0004_cold_weapon_omega.sql`, defaults to `UTC`).
- `/household` settings page: rename the household, member count, timezone
  picker, and a danger zone — leave the household, or delete it when you are the
  only member (deleting cascades rooms, chores, and completions).
- Timezone search (`src/components/timezone-combobox.tsx`): type-to-filter over
  419 zones, ranked exact → prefix → substring → in-order subsequence, showing
  each zone's current UTC offset. Separators are ignored, so `new york` matches
  `America/New_York`.
- Timezone is selected during onboarding, defaulted from the browser.
- New server actions: `updateHouseholdTimezone`, `updateHouseholdName`,
  `leaveHousehold`, `deleteHousehold`.
- Household entry in the user menu (house icon).

### Changed

- **Due and overdue dates are calendar days in the household's timezone**, not
  durations measured from the completion instant. Due/overdue now flip at the
  household's local midnight. Existing households stay on `UTC` until the
  timezone is set on `/household` — set it after deploying.
- The timezone list is computed on the server and passed as props, so the
  rendered picker is identical on both sides of hydration.
- The account settings entry in the user menu is relabelled "Account"; the
  nav-bar gear button is replaced by the household entry in that menu.

### Fixed

- Due/overdue badges ("Due in Nd", "Nd overdue") and "Last done … Nd ago" no
  longer disagree between the server render (UTC container) and the browser, and
  no longer depend on the timezone of the environment doing the rendering.

## [0.1.0] - 2026-05-31

First tagged release — baseline for release tracking.

Household chore tracker: rooms, chores with recurrence intervals, completions,
invite-code joins, Socket.io real-time updates, drag-and-drop room ordering,
better-auth email/password sign-in, and mobile touch targets. Schema at
migration `0003_same_hedge_knight.sql`.

[0.8.1]: https://github.com/talonlikeaclaw/chore/compare/v0.8.0...v0.8.1
[0.8.0]: https://github.com/talonlikeaclaw/chore/compare/v0.7.3...v0.8.0
[0.7.3]: https://github.com/talonlikeaclaw/chore/compare/v0.7.2...v0.7.3
[0.7.2]: https://github.com/talonlikeaclaw/chore/compare/v0.7.1...v0.7.2
[0.7.1]: https://github.com/talonlikeaclaw/chore/compare/v0.7.0...v0.7.1
[0.7.0]: https://github.com/talonlikeaclaw/chore/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/talonlikeaclaw/chore/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/talonlikeaclaw/chore/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/talonlikeaclaw/chore/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/talonlikeaclaw/chore/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/talonlikeaclaw/chore/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/talonlikeaclaw/chore/releases/tag/v0.1.0
