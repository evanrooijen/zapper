import { neon } from '@neondatabase/serverless'
import { drizzle as neonDrizzle } from 'drizzle-orm/neon-http'
import { drizzle as postgresDrizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as schema from '../db/schema'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is required')

const driver = process.env.DB_DRIVER ?? 'postgres'
if (driver !== 'postgres' && driver !== 'neon') {
  throw new Error('DB_DRIVER must be postgres or neon')
}

export const db =
  driver === 'neon'
    ? neonDrizzle(neon(url), { schema })
    : postgresDrizzle(new Pool({ connectionString: url }), { schema })
