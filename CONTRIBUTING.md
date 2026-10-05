# Contributing

Thanks for taking a look. Issues and pull requests are welcome.

## Setup

```sh
npm install
npm run server          # sync server on ws://localhost:8043
npm run start:demo      # Metro for a development build with the demo household
npx expo run:ios        # or run:android, builds the development client once
```

Node 22.13 or newer. iOS builds need Xcode 26 and `LANG=en_US.UTF-8` for
CocoaPods. The Android emulator reaches your machine at `ws://10.0.2.2:8043`.

## Before opening a pull request

```sh
npm run format:check
npm run lint
npm run typecheck
npm run test:coverage
```

CI runs the same checks plus `expo-doctor`, a Docker build of the server and
native iOS and Android builds.

## Ground rules

- **Feature-first.** New code goes in `src/features/<feature>/` split into
  `lib/` (pure, relative imports only), `data/`, `hooks/`, `components/` and
  `screens/`. Routes in `src/app` stay one-liners.
- **No TinyBase in components.** Read through feature hooks, write through
  repositories. ESLint enforces this.
- **Think about merges.** Every write is a CRDT write that another phone may
  contradict while offline. Write only the cells you changed, keep values that
  must change together in one cell, and add a case to
  `src/features/sync/__tests__/mergeConvergence.test.ts` when you introduce a
  new kind of edit.
- **Dates are calendar dates.** Use `features/chores/lib/localDate.ts` and
  `zonedTime.ts`, never `new Date()` arithmetic, for anything scheduled.
- **Typed errors.** Throw `TandemError` with a code; screens branch on codes.
- Comments explain why, not what.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/): `feat(lists): …`,
`fix(sync): …`, `test: …`, `docs: …`. Keep them small; each commit should pass
`npm run typecheck`.
