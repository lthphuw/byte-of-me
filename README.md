<div align="center">
  <h1>
    <a href="https://phu-lth.space/" target="_blank" style="text-decoration: none; color: inherit;">
      Byte of Me
    </a>
  </h1>

  <p>A full-stack portfolio built with Next.js, powered by Supabase and secured by Auth.js. Features a public showcase and a private dashboard for seamless content management.</p>

  <div style="margin: 20px 0;">
    <a href="https://nextjs.org/" target="_blank">
      <img src="https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white&style=flat-square" alt="Next.js" />
    </a>
    <a href="https://ui.shadcn.com/" target="_blank">
      <img src="https://img.shields.io/badge/shadcn/ui-000000?logo=shadcnui&logoColor=fff&style=flat-square" alt="shadcn/ui" />
    </a>
    <a href="https://tanstack.com/query" target="_blank">
      <img src="https://img.shields.io/badge/TanStack_Query-FF4154?logo=react-query&logoColor=fff&style=flat-square" alt="TanStack Query" />
    </a>
    <a href="https://authjs.dev/" target="_blank">
      <img src="https://img.shields.io/badge/Auth.js-000000?logo=nextdotjs&logoColor=white&style=flat-square" alt="Auth.js" />
    </a>
    <a href="https://tailwindcss.com/" target="_blank">
      <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white&style=flat-square" alt="Tailwind CSS" />
    </a>
    <a href="https://www.prisma.io/" target="_blank">
      <img src="https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white&style=flat-square" alt="Prisma" />
    </a>
    <a href="https://supabase.com/" target="_blank">
      <img src="https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=fff&style=flat-square" alt="Supabase" />
    </a>
  </div>

  <p>
    <a href="https://github.com/lthphuw/byte-of-me" target="_blank">
      <img src="https://img.shields.io/github/stars/lthphuw/byte-of-me?style=social" alt="GitHub Stars" />
    </a>
    <a href="https://github.com/lthphuw/byte-of-me/fork" target="_blank" style="margin: 0px 20px;">
      <img src="https://img.shields.io/github/forks/lthphuw/byte-of-me?style=social" alt="GitHub Forks" />
    </a>
  </p>
</div>

---

## About the PublicProject

**Byte of Me** is a high-performance developer portfolio designed to showcase technical expertise, blogs, and projects.
It utilizes a modern monorepo architecture to separate concerns between the frontend, database logic, and storage
services.

### Core Features

* **Data Management:** Powered by **Prisma** (PostgreSQL) and **Supabase** for both database hosting and S3-compatible
  object storage.
* **Authentication:** Robust session management and security via **Auth.js**.
* **State Management:** Efficient data fetching and caching using **TanStack Query & Mutation**.
* **UI/UX:** Built with **shadcn/ui** and Tailwind CSS, featuring full dark/light mode support and mobile
  responsiveness.
* **Global Reach:** Native support for Internationalization (i18n) and multi-language toggling.

## Pages

### Public Pages

*SEO-optimized and pre-rendered (SSG).*

* **Homepage**: Professional summary and hero section.
* **About**: Personal bio, Education and tech stacks.
* **Experience**: Career timeline and professional history *(In Development)*.
* **Projects**: Full-stack portfolio showcase with filtering.
* **Blogs**: Technical article listing with pagination.
* **Blog Details**: Dynamic article view with multi-language support.
* **Contact**: Inquiry form and social links.

### Dashboard (CMS)

*Secure administrative management (SSR).*

* **Statistics**: Overview of content.
* **Media**: Asset management (Supabase Storage / S3).
* **User Profile**: Identity and account settings.
* **Education**: Academic history and thesis details.
* **Blog**: CRUD for articles.
* **Tag**: Taxonomy management for cross-linking content.
* **Tech Stack**: Centralized skill and icon library.
* **Company**: Work history management *(In Development)*.
* **Project**: CRUD for projects *(In Development)*.
* **Translation**: Multi-language content orchestration *(In Development)*.

## Setup Instructions

1. **Clone the Repository**:
   ```bash
   git clone [https://github.com/lthphuw/byte-of-me.git](https://github.com/lthphuw/byte-of-me.git)
   cd byte-of-me
   ```

2. **Install Dependencies**:
   ```bash
   pnpm install
   ```

3. **Set Up Environment Variables**:
   Configure your `.env` files in the following locations based on the provided examples:
  * `apps/web`: Frontend and Auth.js variables.
  * `packages/db`: Prisma and Supabase connection strings.
  * `packages/storage`: S3/Supabase storage credentials.

4. **Run Development Mode**:
   ```bash
   pnpm dev
   ```
   Visit `http://localhost:3000` to see the site in action.

5. **Deployment**:
   The projectSchema is optimized for **Vercel**. Ensure all environment variables from the sub-modules are mapped in
   your Vercel projectSchema settings.

## License

Licensed under the [MIT License](./LICENSE.md).
