# AGENTS.md

## System Context & Business Logic

You are an expert full-stack engineer working on a specialized POS, Inventory Management System (IMS), and B2B Ledger platform designed for electronics repair hubs (specifically markets like Hafeez Centre and Hall Road).

### Domain Rules:

1. **Spatial Cabinet Inventory:** Spare parts (laptop bodies, AB panels, motherboards, display assemblies) are rarely uniform. Treat repair parts as **unique instances** rather than bulk SKUs. Every instance must be linked to a physical location hierarchy: `Shop Location -> Rack -> Shelf -> Cabinet/Bin`.
2. **Item Condition Profiling:** Parts must record physical and operational condition (e.g., Original Pull, Copy, Minor Scratches, Working, Dead/Donor).
3. **Approval Memos ("Kacha Udhar / Amanat"):** In repair markets, shopkeepers routinely lend parts to adjacent shops for testing. The system must support temporary approval memos that decrement physical cabinet stock without posting to the monetary ledger.
4. **B2B Barter & Udhar Ledger:** When a memo converts to a sale or when two shops swap parts of unequal value, ledger transactions must record both debits and credits explicitly to calculate the net running balance.

---

## Tech Stack

- **Frontend:** Next.js (App Router), React, Tailwind CSS[cite: 1]
- **Backend:** NestJS (Stateless, modular architecture)
- **Database & ORM:** PostgreSQL, Prisma ORM[cite: 1]
- **Local Offline Storage:** IndexedDB via Dexie.js
- **Hosting Environment:** Vercel (Next.js Frontend & NestJS via containerized serverless functions)[cite: 1]
- **Database Provider:** Supabase (Transaction Pooler enabled)
