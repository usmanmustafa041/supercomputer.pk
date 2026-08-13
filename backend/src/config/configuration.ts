/**
 * Everything the API reads from its environment, in one place.
 *
 * Read once at boot and validated here rather than reached for with
 * process.env at the point of use. A missing database password should stop the
 * process starting, not surface as a connection error under load an hour later.
 */

export interface AppConfig {
  port: number;
  nodeEnv: string;
  database: {
    url: string;
    poolMax: number;
  };
  storage: {
    endpoint: string;
    region: string;
    bucket: string;
    accessKey: string;
    secretKey: string;
    forcePathStyle: boolean;
  };
  auth: {
    sessionDays: number;
    /**
     * Shared secret the web tier presents on every call.
     *
     * The API is not published outside the compose network, so this is defence
     * in depth rather than the boundary itself: if it were ever exposed by a
     * misconfigured ingress, an anonymous caller still gets nothing.
     */
    internalKey: string | null;
  };
  admin: {
    email: string;
    password: string;
  };
  email: { webhookUrl: string | null; from: string };
}

/** Refuses to boot rather than starting up half configured. */
function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(
      `${name} is not set. The API will not start without it; see .env.example.`,
    );
  }
  return value;
}

function secret(name: string, production: boolean, fallback?: string): string {
  const value = required(name, production ? undefined : fallback);
  if (production && value.length < 32) throw new Error(`${name} must be at least 32 characters in production.`);
  return value;
}

function number(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`${name} must be a number, got ${raw}.`);
  return n;
}

export function loadConfiguration(): AppConfig {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const production = nodeEnv === "production";

  const user = required("POSTGRES_USER", "supercomputers");
  const password = required("POSTGRES_PASSWORD", production ? undefined : "supercomputers");
  const host = required("POSTGRES_HOST", "localhost");
  const db = required("POSTGRES_DB", "supercomputers");
  const port = number("POSTGRES_PORT", 5432);

  return {
    port: number("PORT", 4000),
    nodeEnv,
    database: {
      url:
        process.env.DATABASE_URL ??
        `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}`,
      poolMax: number("POSTGRES_POOL_MAX", 10),
    },
    storage: {
      endpoint: required("S3_ENDPOINT", "http://localhost:9000"),
      region: process.env.S3_REGION ?? "us-east-1",
      bucket: process.env.S3_BUCKET ?? "product-images",
      accessKey: secret("S3_ACCESS_KEY", production, "minioadmin"),
      secretKey: secret("S3_SECRET_KEY", production, "minioadmin"),
      // MinIO serves buckets as a path, not as a subdomain, unlike real S3.
      forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? "true") === "true",
    },
    auth: {
      sessionDays: number("SESSION_DAYS", 14),
      internalKey: secret("INTERNAL_API_KEY", production, "local-internal-key-local-internal-key") || null,
    },
    admin: {
      email: (process.env.ADMIN_EMAIL ?? "admin@supercomputers.pk").toLowerCase(),
      password: secret("ADMIN_PASSWORD", production, "changeme-local"),
    },
    email: {
      webhookUrl: process.env.EMAIL_WEBHOOK_URL || null,
      from: process.env.EMAIL_FROM ?? "no-reply@supercomputers.local",
    },
  };
}
