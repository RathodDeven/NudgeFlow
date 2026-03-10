# Database Package

Shared database client and schema definitions for NudgeFlow.

## Schema
The source of truth for the database schema is located at:
[`packages/db/schema/schema.sql`](./schema/schema.sql)

Whenever you make changes to the database structure, update this file so it can be applied to Neon DB.

## Usage
This package provides a PostgreSQL connection pool and CRUD utilities for users, tenants, and sessions.
