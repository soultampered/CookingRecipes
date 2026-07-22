#!/bin/sh
set -e

# ci_scripts/ci_post_clone.sh lives at mobile/ios/App/ci_scripts/ — Xcode Cloud runs this
# right after cloning, before any build action, so this is where npm dependencies and the
# web build need to be prepared (Xcode Cloud never runs npm itself, and its image has no
# Node.js on PATH by default — only Homebrew).
brew install node

cd "$(dirname "$0")/../../.."

npm install
npm run build
npx cap sync ios
