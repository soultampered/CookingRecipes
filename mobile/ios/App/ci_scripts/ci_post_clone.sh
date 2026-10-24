#!/bin/sh
set -e

# ci_scripts/ci_post_clone.sh lives at mobile/ios/App/ci_scripts/ — Xcode Cloud runs this
# right after cloning, before any build action, so this is where npm dependencies and the
# web build need to be prepared (Xcode Cloud never runs npm itself, and its image has no
# Node.js on PATH by default — only Homebrew).
brew install node

cd "$(dirname "$0")/../../.."

npm install
# The "App Dev" scheme (Stokpot Dev) talks to the dev API from .env.dev, overriding any workflow
# VITE_API_BASE_URL. Every other scheme builds as before.
if [ "$CI_XCODE_SCHEME" = "App Dev" ]; then
  unset VITE_API_BASE_URL
  npx vite build --mode dev
else
  npm run build
fi
npx cap sync ios
