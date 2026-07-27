# CLAUDE.md

# Byte of Me - AI Development Guide

# Project Overview

**Byte of Me** is a multilingual personal portfolio and headless CMS built using modern TypeScript technologies.

It consists of:

- A **public portfolio website**
- A **private CMS dashboard**
- Shared packages for database and storage

The application supports two different translation systems:

1. **Static UI translation** using `next-intl`
2. **Dynamic content translation** stored inside PostgreSQL

This distinction is extremely important and should never be mixed.

---

# Internationalization

There are **two completely different translation systems**.

## 1. next-intl

Used ONLY for:

- buttons
- labels
- menus
- navigation
- validation messages
- dialogs
- fixed UI text

Translations live inside locale JSON files.

---

## 2. Database Translation

Used ONLY for dynamic content:

- blogs
- projects
- experiences
- education
- skills
- tags
- descriptions

Never move database content into locale JSON.

Never store UI strings inside database translations.

---

# Authentication

Authentication is handled using Auth.js.

Dashboard routes are protected.

Never accidentally expose dashboard functionality to public routes.

---

# Storage

All uploads use Supabase Storage.

Never hardcode storage URLs.

Always use storage helper functions.

---

# State Management

Server state:

- TanStack Query

Local UI state:

- React hooks

Do not introduce another global state library unless absolutely necessary.

---

# Component Guidelines

Prefer:

- small components
- reusable components
- composition

Avoid giant components exceeding roughly 300 lines whenever possible.

Extract reusable logic into hooks.

---

# Data Fetching

Prefer:

Server Components whenever possible.

Use Client Components only when required for:

- interactivity
- browser APIs
- TanStack Query
- animations

---

# STRICT RULES

## Rule 1

Never introduce new dependencies unless explicitly requested.

Always prefer existing libraries already used by the project.

---

## Rule 2

Never use `any`.

If unavoidable, explain why.

---

## Rule 3

Never use `@ts-ignore`.

Fix the typing correctly.

---

## Rule 4

Never duplicate existing code.

Extract reusable utilities instead.

---

## Rule 5

Never rewrite large sections of code when a minimal change is sufficient.

Prefer surgical edits.

---

## Rule 6

Do not change folder structure unless explicitly instructed.

---

## Rule 7

Respect existing architecture.

Do not invent new patterns when the repository already has one.

---

## Rule 8

Do not change database schema unless explicitly requested.

---

## Rule 9

Do not modify API contracts unless requested.

---

## Rule 10

Never remove comments that provide useful context.

---

## Rule 11

Preserve backward compatibility whenever possible.

---

## Rule 12

Never hardcode:

- URLs
- API endpoints
- secrets
- IDs
- environment values

Use configuration instead.

---

## Rule 13

Never expose server-only code to client components.

Keep server and client boundaries clear.

---

## Rule 14

Do not fetch data inside deeply nested components if it can be fetched higher in the tree.

---

## Rule 15

Always consider loading, error, and empty states.

---

## Rule 16

Every new feature should be fully typed.

---

## Rule 17

Keep functions focused on a single responsibility.

If a function becomes difficult to understand, split it.

---

## Rule 18

Prefer readability over clever code.

Future maintainability is more important than writing fewer lines.

---

## Rule 19

When multiple solutions exist:

Choose the one that best matches the existing project style.

Consistency is more important than personal preference.

---

## Rule 20

Before implementing a new utility, hook, helper, or component:

Search the repository first to ensure an equivalent implementation does not already exist.

---

# Pull Request Checklist

Before considering work complete, verify:

- [ ] Project builds successfully.
- [ ] No TypeScript errors.
- [ ] No ESLint errors.
- [ ] No duplicated logic introduced.
- [ ] No unnecessary dependencies added.
- [ ] Existing architecture respected.
- [ ] Components remain reusable.
- [ ] Public and dashboard behavior remain correct.
- [ ] Translation system usage is correct.
- [ ] Database queries are efficient.
- [ ] New code follows project conventions.
