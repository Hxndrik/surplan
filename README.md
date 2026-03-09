# surplan

Local-only developer planning tool. Design your database schema, plan your API surface, track features with milestones — and export to 18+ formats. Everything runs in your browser. No backend, no account, no telemetry.

**[surplan.xyz](https://surplan.xyz)**

## Features

- **Entity Designer** — visual database schema builder with columns, types, FK relationships, validation warnings, and tags
- **ERD Visualization** — auto-generated entity relationship diagram with FK edges, cardinality labels, hover highlighting, and draggable layout
- **API Planner** — document endpoints with method, path, auth, query params, request/response bodies, and status codes
- **Feature Tracker** — milestones, priorities, story points, assignees, due dates, dependencies, sprints, kanban board, and velocity metrics
- **18+ Export Formats** — SQL DDL (Postgres/MySQL/SQLite), Prisma, Drizzle, TypeORM, Sequelize, Mongoose, SQLAlchemy, TypeScript, Zod, GraphQL, OpenAPI 3.0, Markdown, HTML docs, GitHub Issues, and more
- **Import** — from SQL, Prisma schema, TypeScript interfaces, or JSON
- **100% Local** — all data in localStorage, works offline, no server communication
- **Command Palette** — Ctrl+K for instant access to every action
- **Dark & Light Themes** — toggle with Ctrl+Shift+L
- **Keyboard-First** — comprehensive shortcuts for power users

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Building for Production

```bash
npm run build
```

Output goes to `dist/`. This is a static SPA — deploy to any static hosting.

## Deployment

The app uses client-side routing (React Router). Your hosting platform must serve `index.html` for all routes.

- **Coolify/Nginx**: `nginx.conf` included at project root with `try_files` SPA routing
- **Netlify**: `_redirects` file included in `public/`
- **Other hosts**: configure a catch-all redirect to `index.html`

## Tech Stack

- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Zustand](https://zustand.docs.pmnd.rs) (state management)
- [dnd-kit](https://dndkit.com) (drag and drop)
- [nanoid](https://github.com/ai/nanoid) (ID generation)

## License

MIT
