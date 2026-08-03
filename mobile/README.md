# Stokpot mobile

SvelteKit frontend, wrapped with Capacitor for iOS/Android.

## Developing

```sh
npm install
npm run dev
```

## Building

```sh
npm run build
```

## Native (iOS/Android)

```sh
npm run cap:ios      # build, sync, open Xcode
npm run cap:android  # build, sync, open Android Studio
npm run cap:sync     # sync web build into native projects
```

See `../` root README for API setup. See project memory / CI docs for Xcode Cloud / TestFlight signing gotchas.
