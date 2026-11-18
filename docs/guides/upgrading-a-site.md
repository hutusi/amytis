# Upgrading a site

A site made with `bun create amytis` is a copy of one Amytis release.
`bun run upgrade` brings a newer release into it. It keeps your changes and
your content, and merges file by file the way git would.

## Before you start

- **Commit everything.** The upgrade won't run with uncommitted changes, or
  outside a git repository, so that the whole upgrade is one diff you can
  review and undo. For the same reason, it won't change a file git doesn't
  track, such as an ignored one, because git couldn't restore it. `--force`
  runs it anyway; then git can't tell the upgrade's changes from yours, so
  it lists every file it changes.
- **Have git and bun installed.** The upgrade merges with `git merge-file` and
  runs `bun install` at the end.
- **Older sites have no `bun run upgrade` script.** Sites made before
  create-amytis 0.2.0 run `bunx create-amytis@latest upgrade` instead, with
  the same options. The upgrade adds the script.

## Run it

```bash
bun run upgrade                  # to the latest release
bun run upgrade -- --dry-run     # list what would change, and change nothing
bun run upgrade -- --to v2.1.0   # to a particular release
```

It prints what it did, the upgrade notes of every release in between (the
`### Upgrading from …` sections of `CHANGELOG.md`), and what is left for you.

## What it does

The `version` in your `package.json` names the release your site was made
from, or last upgraded to. The upgrade downloads that release and the new
one, and compares each file in three versions: the old release's, yours, and
the new release's.

| The file | What happens |
| --- | --- |
| You never changed it | It becomes the new release's version, or is deleted if the release removed it. |
| The release didn't change it | It stays as you have it. |
| You both changed it (text) | The changes are merged. Where they overlap, the file gets conflict markers. |
| You both changed it (binary, or a README) | Yours is kept. The release's is saved beside it as `<file>.amytis-new` (or `<file>.2.amytis-new`, if an earlier upgrade's copy is still there). |
| The release removed it, but you changed it | Yours is kept. |
| You removed it, and the release changed it | It stays removed. The release's is saved as `<file>.amytis-new`. |

Some files have their own rules:

- **`content/` and `public/images/` are never touched.** Neither are files
  Amytis doesn't ship, such as your own components, workflows or
  `.env.local`.
- **`package.json` is merged key by key.** New dependency versions and
  scripts come in, and dependencies you added stay. If you and the release
  both changed one value (say, you pinned `next` and the release bumped it),
  yours is kept and listed. Its `version` becomes the new release's, so the
  next upgrade starts from there.
- **`site.config.ts` is merged against the starter config it began as**
  (`site.config.example.ts`, with your title and description). New config
  fields come in with their default values, and your settings stay.
- **`bun.lock` is regenerated** by `bun install` from the merged
  `package.json`.
- **Line endings don't count as changes.** A site cloned on Windows, where git
  turns line endings into CRLF by default, is compared with the release as if
  it had LF, and its files keep CRLF.
- **Symbolic links are never written through.** A link can lead out of the
  site, where git can't undo a change. So when a file the release changed is
  a link, or is in a linked folder, the upgrade lists it for you to update by
  hand.
- **A file that became a folder, or the reverse.** If a release replaces a
  folder with a file of the same name, or a file with a folder, and you have
  something of your own in the way, the upgrade leaves that for you too.
- **The Amytis repo's own tests and CI** (`tests/`, `.github/`, `packages/`)
  aren't part of a site. Sites made before create-amytis 0.1.4 still have
  them; the upgrade removes them if you haven't changed them.

## After the upgrade

1. Read the upgrade notes it printed, and do what they ask.
2. Resolve each conflict it listed. Search the file for `<<<<<<<`. Your
   version comes first, under `your site`, and the release's follows, under
   `Amytis vX.Y.Z`. Keep what you need, and delete the markers.
3. Compare each `*.amytis-new` file with yours, take what you need, then
   delete it.
4. If you changed `package.json` while resolving, run `bun install` again.
5. Check that the site builds: `bun run validate`.
6. Commit.

The upgrade exits with status 1 when it leaves conflicts or kept files to look
at, or when `bun install` fails, so a script can tell.

To undo an upgrade before you commit it, run
`git restore --staged --worktree .` (plain `git restore .` would keep
anything you've staged since), delete the files it says it created
(`git status` doesn't show one your `.gitignore` covers), then run
`bun install` to put back the dependencies you had. That only works for an
upgrade that ran without `--force`. After a `--force` run over uncommitted
changes, restoring would throw those changes away too, so undo it by hand,
from the list of files the upgrade printed.

## When it can't tell which release you started from

- **If you changed the `version` in `package.json`,** the upgrade can't tell
  which release you started from. It checks that most of your `src/` matches
  the release it would use, and stops if not. Pass the right one with
  `--from vX.Y.Z`.
- **Sites made before create-amytis 0.1.3** began from the demo site's own
  config instead of the starter. That isn't a base the new starter can be
  merged against, so the upgrade leaves `site.config.ts` alone and says so.
  The upgrade does update `site.config.example.ts`, so
  `git diff site.config.example.ts` shows what is new; copy what you need.

## If you cloned the repo instead

A clone shares the Amytis history, so plain git works:

```bash
git remote add upstream https://github.com/hutusi/amytis.git
git fetch upstream --tags
git merge v2.1.0
```

That merge also brings in the demo content, tests and CI that a clone
carries.

## Options

| Option | What it does |
| --- | --- |
| `--to <version>` | Upgrade to this release instead of the latest. |
| `--from <version>` | The release the site was made from or last upgraded to (default: `package.json`'s `version`). |
| `--dry-run` | List what would change, and change nothing. Needs no git. |
| `--force` | Upgrade even with uncommitted changes, or outside git. |
| `--no-install` | Don't run `bun install` afterwards. |
| `--base-dir <dir>`, `--target-dir <dir>` | Use an unpacked release instead of downloading it. CI uses these. |
