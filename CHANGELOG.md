# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
While the version is below `1.0.0`, a minor release may include behavior changes;
those are called out under **Changed**.

## [Unreleased]

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

[Unreleased]: https://github.com/talonlikeaclaw/chore/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/talonlikeaclaw/chore/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/talonlikeaclaw/chore/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/talonlikeaclaw/chore/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/talonlikeaclaw/chore/releases/tag/v0.1.0
