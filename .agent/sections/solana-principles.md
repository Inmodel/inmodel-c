# Solana Principles

To build on Solana, you must unlearn Ethereum/EVM patterns. Solana is high-performance, parallel, and account-based.

### 1. The Account Model
Everything on Solana is an **Account**.
- **Data Accounts:** Store state (like a user's profile or a project's score).
- **Program Accounts:** Store executable code (the "Smart Contract").
- **Signers:** Accounts that have authorized a transaction.

### 2. Programs vs. Smart Contracts
Solana "Programs" are stateless. They logic is separated from the data. When you call a program, you must pass the accounts it needs to read from or write to.

### 3. Parallel Execution (Sealevel)
Solana can process transactions in parallel if they don't touch the same accounts. This is why you must explicitly list all accounts in your transaction.

### 4. Rent and Lamports
Accounts require a small amount of SOL (Lamports) to stay on-chain. Always ensure your accounts are "Rent Exempt" by depositing enough SOL for their size.

### 5. PDAs (Program Derived Addresses)
PDAs allow programs to "sign" for accounts without a private key. They are essential for creating deterministic addresses for user data based on their wallet address.
