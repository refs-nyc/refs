# Refs Developer Onboarding

Welcome to the Refs team! This document summarizes the moving pieces in the repository so you can get productive quickly. It complements the existing architecture notes and scripts guides and should be kept close at hand while you ramp up.

## 1. Product and platform overview
- **What we are building**: Refs is a social discovery protocol and mobile experience that lets people curate, browse, and search an "interest graph" of references, profiles, and connections.【F:docs/index.md†L1-L32】
- **High-level architecture**: User-facing data such as profiles and refs live in PocketBase, while Supabase handles AI-assisted workflows like seven-string generation, vector embeddings, and semantic search. PocketBase hooks keep the two systems in sync and Supabase exposes functions that power matchmaking queries.【F:README-matchmaking.md†L1-L158】

## 2. Core technologies
- **Frontend**: Expo + React Native with Expo Router; the root layout wires up polyfills, navigation, messaging bootstrapping, and shared providers.【F:app/_layout.tsx†L1-L100】
- **Tooling & package management**: The project is pinned to Node 22.11+ and uses pnpm. Standard Expo commands for iOS/Android/web builds are exposed through package scripts.【F:package.json†L1-L105】
- **Documentation site**: VitePress powers the docs found in `/docs`, with npm scripts to run, build, and preview the site.【F:package.json†L8-L21】

## 3. Local environment setup
1. Install the required Node version (use `nvm use` if you have `nvm` installed) and install dependencies with pnpm.【F:README.md†L7-L13】【F:package.json†L5-L7】
2. Run `pnpm prebuild` the first time you prepare an iOS native project; follow up with `pnpm ios` when you are ready to boot the iOS simulator. Android and web entry points are available through `pnpm android` and `pnpm web` respectively.【F:README.md†L10-L14】【F:package.json†L8-L16】
3. Environment variables: create a `.env` file (or configure through Expo secrets) that includes Supabase credentials, your OpenAI key, and the PocketBase base URL before you attempt to log in or call matchmaking services.【F:README-matchmaking.md†L87-L99】【F:SUPABASE_QUICK_START.md†L31-L42】

## 4. Running the app during development
- **Metro bundler & Expo dev client**: `pnpm start` opens the Expo CLI dashboard, letting you choose a target (simulator, device, or web). `pnpm ios` / `pnpm android` build the native shells when you need full device features.【F:package.json†L8-L16】
- **TypeScript type checking**: `pnpm dev` runs `tsc --watch` so you get incremental type feedback while coding.【F:package.json†L8-L12】
- **Web preview**: `pnpm web` launches the app in a browser using Expo's web runtime for quick UI inspection.【F:package.json†L13-L16】

## 5. Backend & data services
- **Supabase provisioning**: Use the setup script in `scripts/setup` (`node setup-supabase-complete.js`) to bootstrap tables, functions, and extensions locally or in a fresh Supabase project. The script enables pgvector, creates the items/users tables, and seeds the OpenAI integration hooks.【F:scripts/README.md†L7-L53】【F:README-matchmaking.md†L63-L143】
- **Edge function deployment**: Follow the quick-start guide to link your Supabase project, deploy the `openai` Edge Function, and set the required secrets before testing with `curl`.【F:SUPABASE_QUICK_START.md†L11-L83】
- **Local supporting services**: `./scripts/start-services.sh` spins up PocketBase on port 8090 and the webhook bridge on 3002; run `./scripts/stop-services.sh` when you are done. This is handy when testing sync hooks without touching production services.【F:scripts/start-services.sh†L1-L25】
- **Matchmaking server**: A Canvas-based sync server entry point lives in `server/index.ts` and is currently commented out pending future work. The `pnpm server` script runs the file with Node's experimental type stripping when revived.【F:package.json†L8-L19】【F:server/index.ts†L1-L45】

## 6. Data maintenance & automation scripts
The `scripts` directory is grouped by use case:
- **`setup/`** for bootstrapping Supabase schemas and functions.
- **`data/`** for tasks like generating seven-strings, syncing PocketBase content, and populating embeddings.
- **`deploy/`** for repeatable function/database releases.
Usage examples for each group are documented directly in `scripts/README.md`, including the commands for initial setup, data processing runs, and deployments.【F:scripts/README.md†L5-L72】 Remember that many scripts expect environment variables and access tokens to be loaded before execution.【F:scripts/README.md†L74-L88】

## 7. Testing & quality assurance
- **Automated checks**: `pnpm test` launches the Jest + Expo test suite, while `pnpm lint` runs Expo's ESLint configuration. Pair these with `pnpm dev` for continuous type checking.【F:package.json†L8-L21】
- **Manual QA**: Follow the walkthrough in `notes/QA.md` for end-to-end validation of onboarding, authentication, profile management, and other flows when preparing releases or reviewing significant UI changes.【F:notes/QA.md†L1-L105】

## 8. Documentation & knowledge sharing
- **Docs site**: `pnpm docs:dev` starts the VitePress dev server, `pnpm docs:build` outputs static assets, and `pnpm docs:preview` lets you inspect the production build locally.【F:package.json†L8-L21】
- **Protocol references**: The `/docs` content (rendered by VitePress) captures deeper protocol details such as data model definitions for refs, profiles, and connections—review `docs/index.md` when building features that touch storage contracts or API boundaries.【F:docs/index.md†L1-L40】

## 9. Getting support
- Check existing Supabase deployment notes for production release steps and troubleshooting tips before contacting platform owners.【F:supabase/deploy-production.md†L1-L105】
- Keep the Supabase Quick Start handy for secrets management reminders and post-deploy validation.【F:SUPABASE_QUICK_START.md†L52-L134】
- When in doubt about scripts or infrastructure, start with `scripts/README.md` to find the right tool for the job and its prerequisites.【F:scripts/README.md†L5-L88】

Welcome aboard! Update this guide as you learn new workflows so the next teammate has an even smoother experience.
