# B-Cal Frontend

A calendar application frontend built with Next.js 16, React 19, and TypeScript.

## Current Status

Authentication is currently implemented. Calendar features are in development.

## Related Repositories

- [Backend](https://github.com/HelplessSneeker/b-cal)

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui components

## Getting Started

### Prerequisites

- Node.js
- pnpm

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

### Build

```bash
pnpm build
```

### Lint

```bash
pnpm lint
```

## Project Structure

```
app/           # Next.js App Router pages and layouts
  login/       # Login page
  signup/      # Signup page
components/    # React components
  ui/          # shadcn/ui primitives
lib/           # Utilities
```
