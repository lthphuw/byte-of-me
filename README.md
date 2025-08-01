<div align="center">
  <h1>
    <a href="https://phu-lth.space/" target="_blank" style="text-decoration: none; color: inherit;">
      Byte of Me
    </a>
  </h1>
  <p>A full-stack portfolio with a free-tier AI assistant powered by a RAG pipeline. Explore my projects and skills through natural language queries, with support for i18n, dark/light mode, and responsive design.</p>

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
    <a href="https://www.pinecone.io/docs/" target="_blank">
      <img src="https://img.shields.io/badge/Pinecone-00C4B4?logo=pinecone&logoColor=fff&style=flat-square" alt="Pinecone" />
    </a>
    <a href="https://langchain-ai.github.io/langgraph/" target="_blank">
      <img src="https://img.shields.io/badge/LangChain-1C3C3C?logo=langchain&logoColor=white&style=flat-square" alt="LangChain" />
    </a>
    <a href="https://ai.google.dev/gemini-api/docs" target="_blank">
      <img src="https://img.shields.io/badge/Google_Gemini-886FBF?logo=googlegemini&logoColor=fff&style=flat-square" alt="Google Gemini" />
    </a>
    <a href="https://vercel.com/docs" target="_blank">
      <img src="https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white&style=flat-square" alt="Vercel" />
    </a>
    <a href="https://www.cloudflare.com/products/turnstile/" target="_blank">
      <img src="https://img.shields.io/badge/Cloudflare_Turnstile-FF6F00?logo=cloudflare&logoColor=fff&style=flat-square" alt="Cloudflare Turnstile" />
    </a>
    <a href="https://upstash.com" target="_blank">
      <img src="https://img.shields.io/badge/Upstash-FF4D4F?logo=redis&logoColor=fff&style=flat-square" alt="Upstash" />
    </a>
  </div>

  <p >
    <a href="https://github.com/lthphuw/byte-of-me" target="_blank">
      <img src="https://img.shields.io/github/stars/lthphuw/byte-of-me?style=social" alt="GitHub Stars" />
    </a>
    <a href="https://github.com/lthphuw/byte-of-me/fork" target="_blank" style="margin: 0px 20px;">
      <img src="https://img.shields.io/github/forks/lthphuw/byte-of-me?style=social" alt="GitHub Forks" />
    </a>
  </p>
</div>

## About the Project

**Byte of Me** is a full-stack developer portfolio that highlights my projects, skills, and experience.
It includes an AI assistant built on a Retrieval-Augmented Generation (RAG) pipeline using [**LangGraph
**](https://langchain-ai.github.io/langgraph/), part of the LangChain ecosystem.

The system supports multiple language models and embedding providers.

![RAG Pipeline](images/RAG_pipeline.jpg)
_RAG Pipeline_

### Language Models (LLMs)

- [**Gemini 2.0 Flash**](https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-0-flash)
- [**Gemini 2.0 Flash Lite**](https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-0-flash-lite)
- [**Gemini 2.5 Flash**](https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash)

### Embedding Models

- [**text-embedding-004**](https://ai.google.dev/gemini-api/docs/models#text-embedding) - optimized for English-language
  tasks
- [**Jina Embedding v3**](https://jina.ai/models/jina-embeddings-v3) - designed for strong multilingual performance

### Vector Store

- [**Pinecone**](https://www.pinecone.io/) for semantic search

### Reranker

- [**Cohere Rerank 3.5**](https://cohere.com/blog/rerank-3pt5)

### Memory + History

- [**PostgresSaver**](https://github.com/langchain-ai/langgraphjs/tree/main/libs/checkpoint-postgres) (Supabase
  PostgreSQL) for storing conversation threads and chat history

The assistant provides **context-aware responses in multilingual**, supporting:

- Stateful AI Assistant
- Internationalization
- Multilingual UI with i18n
- Dark/Light theme toggle
- Responsive design for both mobile and desktop

## Demo

![Byte of Me AI Assistant Demo](./demo/demo.gif)
_Try asking: "What projects has Phu built?" or "What is Phu’s tech stack?"_

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

- Create `.env.local` or `.env` files in `apps/web`, `packages/ai`, and `packages/db` as described in their respective
  READMEs:
  - [Web Frontend (apps/web)](apps/web/README.md)
  - [AI Assistant (packages/ai)](packages/ai/README.md)
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

| Technology                                                                                                        | Purpose                               |
  |-------------------------------------------------------------------------------------------------------------------|---------------------------------------|
| [**Next.js**](https://nextjs.org/)                                                                                | Frontend framework                    |
| [**Tailwind CSS**](https://tailwindcss.com/docs)                                                                  | Utility-first styling                 |
| [**Framer Motion**](https://www.framer.com/motion/)                                                               | UI animations and transitions         |
| [**Radix UI**](https://www.radix-ui.com/)                                                                         | Accessible UI primitives              |
| [**React Bits**](https://github.com/DavidHDev/react-bits)                                                         | UI components                         |
| [**Prisma**](https://www.prisma.io/docs)                                                                          | ORM for PostgreSQL                    |
| [**Supabase**](https://supabase.com/docs)                                                                         | Auth and storage backend              |
| [**Pinecone**](https://www.pinecone.io/)                                                                          | Vector database for RAG               |
| [**LangChain.js**](https://langchain-ai.github.io/langgraph/)                                                     | RAG pipeline framework                |
| [**PostgresSaver**](https://github.com/langchain-ai/langgraphjs/tree/main/libs/checkpoint-postgres)               | Save conversation state               |
| [**Google Gemini 2.0 / 2.5 Flash**](https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/gemini) | Fast LLMs for chat                    |
| [**text-embedding-004**](https://ai.google.dev/gemini-api/docs/models#text-embedding)                             | English embedding model               |
| [**Jina Embedding v3**](https://docs.jina.ai/embeddings/jina-embeddings-v3/)                                      | Multilingual embedding                |
| [**Cohere Reranker**](https://docs.cohere.com/docs/rerank-overview)                                               | Reranking retrieved documents         |
| [**Vercel**](https://vercel.com/docs)                                                                             | Hosting and deployment                |
| [**Cloudflare Turnstile**](https://www.cloudflare.com/products/turnstile/)                                        | CAPTCHA for bot protection            |
| [**Upstash**](https://upstash.com)                                                                                | Redis-based rate limiting and caching |

## Contributing

Contributions are welcome! Please open an issue or submit a pull request to suggest improvements or report bugs.

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE.md) for details.

---
