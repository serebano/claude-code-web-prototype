# Versioning and releases

Use semantic versions: patch for fixes, minor for new prototype interactions, major for incompatible stored-state changes. Preserve older screenshot folders and tags.

1. Run `npm version patch --no-git-tag-version` (or minor/major) and update CHANGELOG.md.
2. Run `npm run build`; run the pinned Linux interaction and screenshot suite described in ../TESTING.md, and review the browser checklist in INTERACTION-AUDIT.md.
3. Capture the current prototype using only sample content into `docs/screenshots/vX.Y.Z/`. Include workspace, settings, splits and mobile. Do not include real Claude conversations or account data.
4. Update that folder's manifest.json with version, capture date, viewport, filenames and SHA-256 hashes. Run `npm run verify:release`.
5. Commit source and screenshots together, push main, and create an annotated `vX.Y.Z` tag on that exact commit. Never move an existing release tag.
6. Create a GitHub release from that tag using the matching changelog entry. Keep the repository private.
7. Publish the same commit to the existing private Site using its configured workflow. Record the resulting site revision in the release notes if available.

Reproduce a release with `git checkout vX.Y.Z`, `npm ci`, `npm run build`, and `npm run preview`.
