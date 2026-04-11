# Byte of Me - Architecture Standard (FSD)

This document defines the architectural boundaries for the Byte of Me portfolio and dashboard.

## 🏗 Layer Responsibilities

| Layer        | Responsibility | Contents                                                         |
|:-------------|:---------------|:-----------------------------------------------------------------|
| **App**      | Global Setup   | Providers, Global CSS, Root Layout, i18n Middleware.             |
| **Pages**    | Routes         | Next.js App Router folders. Minimal logic; only renders Widgets. |
| **Widgets**  | Composition    | Autonomous page blocks (e.g., `ProjectGrid`, `AdminHeader`).     |
| **Features** | User Actions   | Functional UI (e.g., `UpdateBioForm`, `DeleteProjectBtn`).       |
| **Entities** | Business Logic | Domain units (e.g., `ProjectCard`, `useTechStackQuery`).         |
| **Shared**   | Infrastructure | UI Kit (shadcn), Prisma Client, S3 Client, Utilities.            |

---

## UI Placement Standards

### 1. Entities (`src/entities/**/ui`)

**Standard:** Must be "Pure" or "Dumb."

- **Yes:** `ProjectCard`, `UserAvatar`, `SkillBadge`.
- **No:** `ProjectCardWithEditButton` (The button belongs in Features).
- **Data Flow:** Receives data via props.

### 2. Features (`src/features/**/ui`)

**Standard:** Must handle an interaction or business process.

- **Yes:** `ProjectCreateForm` (Handles multi-lang state), `AvatarUploader`.
- **No:** Generic inputs (Those belong in Shared).
- **Data Flow:** Triggers Server Actions or Mutations.

### 3. Widgets (`src/widgets/**/ui`)

**Standard:** Must be ready to use on a page with zero configuration.

- **Yes:** `TechStackList` (Combines Entity/Icons + Feature/Filter).
- **Yes:** `ProjectAdminTable` (Combines Entity/Rows + Feature/Delete).

---

## Internationalization (i18n) Logic

The projectSchema uses `next-intl`.

- **Public Site:** Data is filtered by locale at the **Entity API** level. Components receive a single string for
  names/descriptions.
- **Dashboard:** Data is fetched as a full object. Features handle the state for multiple input fields (e.g.,
  `description_en` and `description_vn`).

## Database & Storage

- **ORM:** Prisma Client is initialized in `src/shared/api/prisma.ts`.
- **Storage:** S3 configuration is localized in `src/shared/api/s3.ts`.
- **Reads:** Always place read-only Prisma queries in `entities/**/api`.
- **Writes:** Always place write/update Server Actions in `features/**/model`.
