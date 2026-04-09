# Common Mistakes

Avoid these pitfalls to stay on track.

### 1. Over-Engineering the Program
- **Mistake:** Trying to build a DAO, a Dex, and a Lending protocol in one program.
- **Fix:** Start with a single instruction and one data account.

### 2. Ignoring User UX
- **Mistake:** Forgetting to handle "Transaction Pending" or "Wallet Not Connected" states.
- **Fix:** Always provide visual feedback for every user action.

### 3. Poor Error Handling
- **Mistake:** Catching an error and doing nothing, or showing a generic "Something went wrong."
- **Fix:** Show the specific reason for failure (e.g., "Insufficient SOL for transaction").

### 4. Building Without Testing
- **Mistake:** Writing 500 lines of Rust and trying to deploy it for the first time on the last day.
- **Fix:** Write tests as you go. Deploy small, working versions to Devnet frequently.

### 5. Not Using IDs in Code
- **Mistake:** Hardcoding wallet addresses or program IDs in multiple files.
- **Fix:** Use a single config file or environment variables for all addresses.
