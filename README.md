<div align="center">
  <h1>
    <a href="https://phu-lth.space/" target="_blank" style="text-decoration: none; color: inherit;">
      Byte of Me
    </a>
  </h1>
  <p>Byte of Me is a full-stack developer portfolio showcasing projects, blogs, and technical experience, with a clean public site and a private dashboard for content management.</p>
  <div style="margin: 20px 0;">
    <a href="https://nextjs.org/" target="_blank">
      <img src="https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white&style=flat-square" alt="Next.js" />
    </a>
    <a href="https://github.com/DavidHDev/react-bits" target="_blank">
      <img src="https://img.shields.io/badge/React_Bits-00D8FF?logo=react&logoColor=fff&style=flat-square" alt="React Bits" />
    </a>
    <a href="https://www.radix-ui.com/" target="_blank">
      <img src="https://img.shields.io/badge/Radix_UI-161618?logo=radixui&logoColor=fff&style=flat-square" alt="Radix UI" />
    </a>
    <a href="https://www.framer.com/motion/" target="_blank">
      <img src="https://img.shields.io/badge/Framer_Motion-0055FF?logo=framer&logoColor=fff&style=flat-square" alt="Framer Motion" />
    </a>
    <a href="https://tailwindcss.com/docs" target="_blank">
      <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white&style=flat-square" alt="Tailwind CSS" />
    </a>
    <a href="https://www.prisma.io/docs" target="_blank">
      <img src="https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white&style=flat-square" alt="Prisma" />
    </a>
    <a href="https://supabase.com/docs" target="_blank">
      <img src="https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=fff&style=flat-square" alt="Supabase" />
    </a>
    <a href="https://vercel.com/docs" target="_blank">
      <img src="https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white&style=flat-square" alt="Vercel" />
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

## About the Project
**Byte of Me** is a full-stack developer portfolio that highlights projects, blogs, skills, and experience. It features a public site for showcasing content and a private dashboard with login for managing personal information and content.

The system supports:
- Internationalization (i18n)
- Multilingual UI
- Dark/Light theme toggle
- Responsive design for mobile and desktop

## Setup Instructions
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/lthphuw/byte-of-me.git
   cd byte-of-me
   ```
2. **Install Dependencies**:
   ```bash
   pnpm install
   ```
3. **Set Up Environment Variables**:
  - Create `.env.local` or `.env` files in `apps/web`, `packages/db`, and `packages/logger` as described in their respective READMEs:
    - [Web Frontend (apps/web)](apps/web/README.md)
    - [Database (packages/db)](packages/db/README.md)
    - [Logger (packages/logger)](packages/logger/README.md)
4. **Run the Development Server**:
  - From the root directory:
    ```bash
    pnpm dev
    ```
  - Open `http://localhost:3000` in your browser.
5. **Deploy to Vercel**:
  - Push your code to GitHub.
  - Connect your repository to Vercel via the Vercel dashboard.
  - Add module-specific environment variables to Vercel’s _Settings > Environment Variables_ (see submodule READMEs).

## Techstack
| Technology | Purpose |
|------------|---------|
| [**Next.js**](https://nextjs.org/) | Frontend framework |
| [**Tailwind CSS**](https://tailwindcss.com/docs) | Utility-first styling |
| [**Framer Motion**](https://www.framer.com/motion/) | UI animations and transitions |
| [**Radix UI**](https://www.radix-ui.com/) | Accessible UI primitives |
| [**React Bits**](https://github.com/DavidHDev/react-bits) | UI components |
| [**Prisma**](https://www.prisma.io/docs) | ORM for PostgreSQL |
| [**Supabase**](https://supabase.com/docs) | Auth and storage backend |
| [**Vercel**](https://vercel.com/docs) | Hosting and deployment |

## License
This project is licensed under the MIT License.
See [LICENSE](./LICENSE.md) for details.
---
