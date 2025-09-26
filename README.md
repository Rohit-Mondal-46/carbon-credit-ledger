# Reflection Questions:

### 1. How did you design the ID so it’s always the same for the same input?
I have used SHA-256 hashing with canonical input formatting for generating deterministic IDs.

1. **Canonicalization Process:**
   - All string fields (project_name, registry, serial_number) are trimmed and converted to lowercase.
   - Numeric fields (vintage, quantity) are converted to strings.
   - Fields are concatenated with pipe separator: project_name|registry|vintage|quantity|serial_number.

2. **Hashing:**
   - SHA-256 hash is computed from the canonical string.
   - Result is encoded as a 64-character hexadecimal string.

This ensures identical inputs always produce the same ID.

### 2. Why did you use an event log instead of updating the record directly?

The event log provides several benefits for this case:

1. **Immutable Audit Trail:**
   - Complete history of all state changes.
   - Cannot be tampered with or deleted.

2. **Credit Misuse Prevention:**
   - Clear record of when credits were retired.
   - Impossible to "un-retire" credits.

3. **Traceability:**
   - Full lifecycle tracking from creation to retirement.

### 3. If two people tried to retire the same credit at the same time, what would break? How would you fix it?

**What Would Break:**
1. Two retirement events for the same credit.
2. Invalid system state (credit retired twice).

**Solution:**

**Transaction Isolation:**
   - All operations wrapped in database transactions.
   - ACID properties ensure consistency.
   - Rollback on constraint violations.


# Carbon Credit Ledger API

REST API for managing carbon credit records with full audit trails and race-safe operations. Built with Node.js, Express.js, and PostgreSQL.

## Quick Start

### Prerequisites

- Node.js 18+ LTS
- PostgreSQL database (Neon DB recommended/Local Db)

### Installation

1. **Clone and setup the project:**
```bash
git clone <repository-url>
cd carbon-credit-ledger
npm install
```

2. **Configure environment:**
```bash
# refer env.example
# Edit .env with your database connection string
# DATABASE_URL=postgresql://username:password@hostname:port/database
```

4. **Start the server:**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

