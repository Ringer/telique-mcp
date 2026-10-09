# Repository Guidelines

## Project Structure & Module Organization

`src/index.ts` is the stdio MCP entry point; `src/lib.ts` exposes the reusable library surface. API access and configuration live in `src/client.ts` and `src/config.ts`. Add MCP registrations under `src/tools/`, shared helpers under `src/utils/`, and shared interfaces in `src/types.ts`. Keep the tool knowledge text in `src/knowledge.ts`. `scripts/validate-openapi.ts` checks `openapi.yaml` against expected endpoints. `dist/` is generated output and should not be edited by hand. Installation guidance belongs in `README.md` or `INSTALL.md`; focused design notes belong in `docs/`.

## Build, Test, and Development Commands

- `npm ci` installs the lockfile-pinned dependencies (Node 22 is used in CI).
- `npm run dev` runs the TypeScript stdio server directly with `tsx`.
- `npm run build` compiles strict TypeScript and declarations into `dist/`.
- `npm start` runs the compiled CLI from `dist/index.js`.
- `npm run validate:openapi` verifies required API paths and parameters in `openapi.yaml`.

Run the build and OpenAPI validation before submitting changes. Publishing is release-driven through `.github/workflows/publish.yml`; do not publish manually as part of ordinary development.

## Releasing

1. Bump `version` with `npm version X.Y.Z --no-git-tag-version`. This updates both `package.json` and `package-lock.json`; keep them in sync.
2. Merge the PR to `main`.
3. Run `gh release create vX.Y.Z --target main` with release notes. Publishing the release triggers `publish.yml`, which runs `npm publish --provenance`. Pushing a tag alone does nothing.
4. Confirm the release on the registry (`curl https://registry.npmjs.org/telique-mcp`). Registry metadata can lag a successful publish by about 2 minutes.

The `NPM_TOKEN` secret is a granular npm token that must have read and write access to the `telique-mcp` package specifically. npm caps these at 90 days; the current one expires around 2027-01-07. An `E404 ... PUT` from `npm publish` means the token is expired or wrongly scoped, not that the package is missing. To recover, set a new token with `gh secret set NPM_TOKEN`, then run `gh run rerun <run-id> --failed`.

## Coding Style & Naming Conventions

Use two-space indentation, double quotes, semicolons, and strict TypeScript. This is an ESM project using Node16 module resolution, so local imports include the `.js` suffix even in `.ts` files. Use `camelCase` for variables and functions, `PascalCase` for types/classes, and snake_case for MCP tool names and wire parameters. Keep tool registration functions named `register*Tools`, validate inputs with Zod, and reuse shared response/error helpers and read-only annotations.

## Testing Guidelines

No automated test framework or coverage threshold is currently configured. Treat `npm run build` as the type-safety gate and `npm run validate:openapi` as the contract check. When changing a tool, manually exercise its success and error paths through an MCP client or the development server. Every data request goes through the Telique API gateway (source in the sibling `ringer-telique` repo; routes in `k8s/gateway-simplified/gateway/route-inventory/inventory.json`, scopes in `config/routing-map.json`). There is no anonymous access. Errors use `{success, code, message, request_id}` with codes INVALID_TOKEN, SCOPE_DENIED, MALFORMED_PATH, FORBIDDEN, RATE_LIMITED and UPSTREAM_UNAVAILABLE. Build paths with `apiPath()` from `src/utils/paths.ts`, and check LERG table names against the live `/v1/lerg/tables` list: tables 10 and up have no underscore, e.g. `lerg12`. Update `openapi.yaml` whenever endpoint paths or parameters change.

## Commit & Pull Request Guidelines

Recent history uses Conventional Commit-style subjects such as `feat(setup): ...`, `fix(openapi): ...`, `docs: ...`, and `chore: ...`. Keep commits focused and use an optional scope when it clarifies the affected area. Pull requests should explain user-visible behavior, list validation performed, link the relevant issue, and include sample tool input/output for protocol changes. Update documentation and version metadata when a release-facing change requires them.

## Security & Configuration

Copy `.env.example` for local variable names, but never commit `.env`, API tokens, or `~/.telique/config.json`. Prefer `TELIQUE_API_TOKEN`; only override `TELIQUE_API_BASE_URL` intentionally. Avoid logging credentials or full sensitive API responses.
