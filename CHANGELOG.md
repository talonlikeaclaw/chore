# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
While the version is below `1.0.0`, a minor release may include behavior changes;
those are called out under **Changed**.

## [Unreleased]

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

[Unreleased]: https://github.com/talonlikeaclaw/chore/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/talonlikeaclaw/chore/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/talonlikeaclaw/chore/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/talonlikeaclaw/chore/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/talonlikeaclaw/chore/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/talonlikeaclaw/chore/releases/tag/v0.1.0
