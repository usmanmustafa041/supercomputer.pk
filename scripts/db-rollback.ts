import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Pool } from "pg";

const url=process.env.DATABASE_URL??`postgresql://${process.env.POSTGRES_USER??"supercomputers"}:${process.env.POSTGRES_PASSWORD??"supercomputers"}@${process.env.POSTGRES_HOST??"localhost"}:5432/${process.env.POSTGRES_DB??"supercomputers"}`;
const pool=new Pool({connectionString:url});
const client=await pool.connect();
try{await client.query("SELECT pg_advisory_lock(8392012601)");const last=await client.query<{version:string}>("SELECT version FROM schema_migrations WHERE version<>'202608120000_legacy_baseline' ORDER BY applied_at DESC LIMIT 1");if(!last.rows[0])throw new Error("No reversible migration is applied.");const version=last.rows[0].version;const sql=await readFile(join(process.cwd(),"src/lib/db/migrations",`${version}.down.sql`),"utf8");await client.query("BEGIN");try{await client.query(sql);await client.query("DELETE FROM schema_migrations WHERE version=$1",[version]);await client.query("COMMIT");console.log(`Rolled back ${version}`);}catch(error){await client.query("ROLLBACK");throw error;}}finally{await client.query("SELECT pg_advisory_unlock(8392012601)").catch(()=>undefined);client.release();await pool.end();}
