# Best Practices

Follow these guidelines for clean, maintainable, and efficient development.

### 1. Solana/Anchor
- **Validation:** Use `#[account(mut, has_one = ...)]` for security. Never trust user inputs without validation.
- **Error Handling:** Use custom errors with `error!` for clear debugging.
- **Testing:** Write Anchor tests for all instructions. Test for failure cases as well as successes.

### 2. FastAPI Backend
- **Type Safety:** Use Pydantic schemas for request and response validation.
- **Concurrency:** Use `async` for all API routes and external calls.
- **Environment:** Keep secrets in `.env` and use `.env.example` for the repo.

### 3. Next.js Frontend
- **Reusable Components:** Build modular UI components for wallets, forms, and charts.
- **Optimistic UI:** Show feedback immediately after a transaction is signed.
- **Hydration:** Be careful with wallet state and SSR hydration. Use a "Client-Only" wrapper if needed.

### 4. General
- **Linting:** Use ESLint for JS/TS, Ruff for Python, and Cargo Clippy for Rust.
- **Documentation:** Write JSDoc or Python docstrings for complex logic.
