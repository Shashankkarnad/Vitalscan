#!/usr/bin/env bash
# Vercel Ignored Build Step convention is inverted:
#   exit 0 → skip the deployment
#   exit 1 → run the build
# Always build (preview + production) so merges to main actually deploy.
echo "vercel ignoreCommand: always build"
exit 1
