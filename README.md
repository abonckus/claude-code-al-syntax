# al-syntax

A [Claude Code](https://claude.com/claude-code) mod that highlights **AL** (Microsoft Dynamics 365 Business Central) code in Claude's replies, using the [tree-sitter-al](https://github.com/SShadowS/tree-sitter-al) grammar.

Claude Code's built-in highlighter has no AL grammar, and plugins cannot add one to it yet. So this mod redraws the replies that contain ```` ```al ```` blocks itself: the prose is drawn by Claude Code as usual, and each AL block is parsed by tree-sitter and coloured.

## Requirements

- Claude Code with mod (function hook) support
- [Node.js](https://nodejs.org) on your `PATH` (tested with Node 25)

Everything else ships with the mod: the tree-sitter runtime (`web-tree-sitter`), the compiled AL grammar and its highlight query. Nothing is downloaded or compiled at run time.

## Install

```sh
git clone https://github.com/abonckus/claude-code-al-syntax
claude --plugin-dir ./claude-code-al-syntax
```

To load it in every session, add the folder to `CLAUDE_CODE_PLUGIN_DIRS`.

## How it works

1. A `ui.render` hook on `AssistantMessage` looks for closed ```` ```al ```` fences. A reply without one is left to Claude Code untouched.
2. Each AL block is sent to `highlighter/highlight.mjs`, run by `node` in a separate process (mods have no WebAssembly of their own). It parses the code with tree-sitter-al and answers with highlight captures.
3. The mod colours the captures (a GitHub-dark palette) and draws the block in a frame. Results are cached per block, so a reply that redraws while it streams is parsed once per finished block.

## Using the highlighter elsewhere

`highlighter/highlight.mjs` is a plain command, usable by any tool that can run one:

```sh
node highlighter/highlight.mjs < MyCodeunit.Codeunit.al
```

It reads AL source on stdin and writes one JSON array of `[text, capture]` spans to stdout, where `capture` is a tree-sitter highlight name (`keyword.control`, `function.definition`, `comment.line`…) or `null`. The spans join back into the input exactly. A non-zero exit means it could not highlight, with the reason on stderr.

For example, a previewer that takes external highlighter commands can be pointed at it for the `al` language.

## Limitations

- **Fenced blocks only.** Only ```` ```al ```` blocks are coloured, and only once their closing fence has arrived; while a block is still streaming it shows as plain text.
- **One mod per reply.** Claude Code draws a reply with the first mod that redraws it. A reply with AL code is drawn by this mod, so another mod that also redraws replies (for example one that turns file paths into links) does not apply to that reply.
- **Dark palette.** The colours are chosen for a dark terminal theme.
- **Fallback.** If `node` cannot be run, AL blocks are drawn plain and a toast says why, once per session. A reply large enough to pass Claude Code's drawing limit has its later AL blocks drawn plain.
- **The reply bullet.** A redrawn reply loses its leading bullet.

## Updating the grammar

The grammar files come from a tree-sitter-al release, and the query must match the `.wasm` of the same tag:

```sh
gh release download <tag> -R SShadowS/tree-sitter-al -p tree-sitter-al.wasm -D highlighter/grammar --clobber
gh api "repos/SShadowS/tree-sitter-al/contents/queries/highlights.scm?ref=<tag>" --jq .content | base64 -d > highlighter/grammar/highlights.scm
```

`web-tree-sitter` is vendored from npm (`web-tree-sitter.js`, renamed to `.mjs`, and `web-tree-sitter.wasm`). Keep its version compatible with the grammar's tree-sitter ABI.

## Development

```sh
claude plugin validate .
claude plugin test .
```

`hooks/fences.ts` splits a reply into prose and AL blocks, and `hooks/theme.ts` maps captures to colours, each with its own `*.test.ts`. `hooks/render.test.ts` mounts a reply and checks the drawn tree, the fallback without Node, and that other replies are left alone.

## Releasing

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org): `feat: …`, `fix: …`, `docs: …`, `refactor: …`, `perf: …`, `test: …`, `ci: …`, `chore: …`, with an optional scope (`feat(search): …`) and `!` for a breaking change. The release notes group commits by that type; others are listed under *Other changes*.

To release, bump `version` in `.claude-plugin/plugin.json` through a pull request, then tag the merge commit:

```sh
git tag v0.2.0 && git push origin v0.2.0
```

The Release workflow checks the tag matches the version, validates and tests the plugin, writes the changelog since the previous tag, and publishes a GitHub release with the plugin as a zip.

## License

[MIT](LICENSE). Third-party components are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
