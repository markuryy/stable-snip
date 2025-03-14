# StableSnip Development Guide

## Commands
- Build/Dev: `bun dev` or `npm run dev` - Runs Next.js with Turbopack
- Production: `bun build` or `npm run build` - Creates production build
- Start: `bun start` or `npm run start` - Starts production server
- Lint: `bun lint` or `npm run lint` - Runs ESLint

## Code Style
- **TypeScript**: Strict mode with ES2017 target
- **Components**: React functional components with explicit return types
- **Naming**: PascalCase for components/types, camelCase for variables/functions
- **Imports**: Named imports preferred, organize by source location
- **Path Aliases**: Use `@/*` for project root imports
- **Error Handling**: Try/catch with explicit error logging and fallbacks
- **Styling**: Tailwind CSS with clsx/cva for conditional classes
- **React**: "use client" directive for client components
- **Types**: Explicit typing for function parameters and returns

## Architecture
This project is a Next.js application for image processing with metadata extraction/injection.