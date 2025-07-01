# 📸 Byte of Me

> A personal digital garden — built for storytelling, self-reflection, and showcasing growth as a developer, one byte at a time.

<div align="flex center">  
    <img src="./images/mobile.png" alt="Mobile view" width="45%" style="border-radius: 8px;" />
  <img src="./images/pc.png" alt="Desktop view" width="45%" style="border-radius: 8px; margin-right: 1rem;" />
</div>

---

## A minimalist and extensible personal website template

Built with [Next.js](https://nextjs.org/), [Tailwind CSS](https://tailwindcss.com/), and [Prisma](https://www.prisma.io/) ORM, this project serves as a clean foundation for blogs, portfolios, or digital gardens.

🖥️ **Demo:** [https://phu-lth.space/](https://phu-lth.space/)

## Features

- Personal profile with bio, quote, and timeline.
- Developer journey & reflections.
- Multilingual support (EN, VI, FR) with `next-intl`.
- Dark & Light theme with system preference.
- Uses `unstable_cache` and **Prisma Accelerate** for efficient data caching.

---

## Tech Stack

| Layer      | Stack                                                                                        |
| ---------- | -------------------------------------------------------------------------------------------- |
| Frontend   | [Next.js](https://nextjs.org/) (App Router)                                                  |
| Backend    | [Prisma](https://www.prisma.io/) ORM & [Prisma Accelerate](https://www.prisma.io/accelerate) |
| Database   | PostgreSQL, [Supabase](https://supabase.com/) .                                              |
| Styling    | [Tailwind CSS](https://tailwindcss.com/)                                                     |
| i18n       | [next-intl](https://github.com/amannn/next-intl) + dynamic translation.                      |
| Deployment | [Vercel](https://vercel.com/)                                                                |

---

## Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/lthphuw/byte-of-me.git
cd byte-of-me

# 2. Install dependencies
pnpm install

# 3. Setup environment
cp .env.example .env

# 4. Run migrations & seed
cd apps/web
npx prisma migrate dev --name <name>
npx prisma db seed

# 5. Start development server
pnpm dev
```

## Future work

## License

[MIT License](./LICENSE.md) — feel free to use, modify, and share.
