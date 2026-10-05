# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-10-05

### Added

- Households: create, join by invite link or QR code, member names and
  colours, soft leave that keeps history and rotations intact.
- Lists for groceries and to-dos with categories in aisle order, quantities,
  notes, assignees, due dates, reordering, swipe to complete or delete, undo.
- Chores with daily, weekly and custom-day recurrence, take-turns rotation,
  and time-zone-safe scheduling of the next occurrence.
- Local-first sync: TinyBase `MergeableStore` persisted to SQLite, WebSocket
  sync with jittered reconnect, a sync pill with pending-change count, a
  "work offline" switch, and presence with live editing indicators.
- Quick add: an offline rule-based parser plus an optional LLM parser on the
  sync server (AI SDK v7 structured output), with a confirm-first preview.
- iOS home-screen widget for today's chores (`expo-widgets`).
- Local reminders for chores and to-dos assigned to you or to anyone.
- Self-hostable sync server with per-room JSON persistence, health check,
  rate-limited quick-add endpoint and a Dockerfile.
- Demo mode with a fictional household.
- Test suite with a merge-convergence suite, real-socket server tests,
  screen tests, Maestro flows and a 90% coverage gate.
