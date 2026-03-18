Update the project documentation by comparing it against the actually implemented code.

## Scope

Check and update these files:
- `/CLAUDE.md` (root)
- `/apps/api/CLAUDE.md`
- `/apps/web/CLAUDE.md`
- `/README.md` (root)
- `/apps/api/README.md`
- `/apps/web/README.md`

## Instructions

1. **Read all documentation files** listed above.
2. **Explore the codebase** to verify what's actually implemented:
   - `package.json` files (root, apps/api, apps/web, packages/*) for dependencies, scripts, and engine requirements
   - `docker-compose.yml` for services and their configuration
   - `apps/api/src/app.module.ts` for imported modules
   - `apps/api/prisma/schema.prisma` for current database models
   - `apps/api/src/config/env.validation.ts` for environment variables
   - `.github/workflows/` for CI/CD pipeline
   - `apps/api/Dockerfile` and `apps/web/Dockerfile` for Docker setup
   - `.env.example` files for environment variable documentation
   - `.husky/` for pre-commit hooks
   - Any new modules, services, or features not yet documented
3. **Compare** the docs against the code and identify discrepancies:
   - Missing features (e.g., new modules, services, dependencies, env vars)
   - Outdated information (e.g., wrong versions, removed features, changed behavior)
   - Incorrect details (e.g., wrong ports, wrong service counts, wrong model fields)
4. **Update** the documentation to match the code. Be careful to:
   - NOT add unnecessary details or bloat
   - Keep the root CLAUDE.md under 300 lines
   - Keep sub-project CLAUDE.md files focused and concise
   - Preserve the existing structure and style of each file
   - Only change what's actually wrong or missing
5. **Do NOT** create new documentation files — only update existing ones.
