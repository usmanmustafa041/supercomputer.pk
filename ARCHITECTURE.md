# How this is put together

Three workspaces, four containers, two networks.

```
repo
├── shared/     the domain: catalogue generator, compatibility engine, types
├── backend/    NestJS API. Owns Postgres and MinIO. Nothing else touches them.
└── frontend/   Next.js. Renders pages. Holds no database credentials.
```

```
browser ──▶ web :3000 ──▶ api :4000 ──▶ postgres :5432
            [ edge ]      [ edge ]      [ data ]
                          [ data ] ──▶ minio :9000
                                        [ data ]
```

## Why the tiers are split

The web tier used to open a Postgres connection itself. That works, and it is
how the site was built for weeks, but it means every page and every server
action is one careless query away from the whole database. There is no seam to
audit and no boundary to enforce a rule at.

Now the web tier has no driver installed, no credentials in its environment,
and no route to the database. Those are three separate defences and the last
one is the strongest: `web` is on the `edge` network only, so even a container
that somehow acquired the password has nothing to connect to. The API is the
only service on both networks, which is what makes it the sole path between
them.

Verified rather than assumed. `web` cannot open a socket to `db` or to `minio`;
it can reach `api`; `api` can reach both.

## Why NestJS

Because the boundary needs structure that survives more than one person working
on it. Controllers describe the surface, services hold the rules, repositories
hold the SQL, and DTOs describe what is acceptable. Guards apply across
everything at once rather than being remembered per handler.

That last part matters more than it sounds. The auth guard is registered
globally and every endpoint is closed unless it is marked `@Public()`. A new
controller written by somebody who was not thinking about auth is unreachable
rather than wide open, which is the failure worth having.

## Why MinIO

Uploads were files on a Docker volume. That tied them to one machine's disk, so
a second API container could not serve what the first had written; it made
backup a separate manual job; and it put a filesystem path in a request handler,
which is one traversal bug from serving `/etc/passwd`.

MinIO speaks the S3 API, so the same code and the same credentials point at AWS
S3, Cloudflare R2 or Backblaze by changing three environment variables. The
hosting decision is not baked in.

Object keys are the SHA-256 of the file's own contents. The same photograph
uploaded twice is stored once, keys cannot collide, and because the key changes
whenever the bytes do, an object can be cached forever without going stale.

The bucket is private, and the API checks that at boot by making an
unauthenticated request against it. The first version of that check set a bucket
policy instead: MinIO implements a subset of the S3 policy language, rejected
the condition key, and the only thing the code produced was a warning that
looked like it had worked. Asserting the property beats declaring the intent.

## Why the domain package is shared and not behind the API

Two things live in `shared/` and both are there for a reason.

**The database is the catalogue authority.** The shared package supplies the
initial seed and compatibility types, but public browsing, admin edits and quote
validation resolve active product rows through the API. This prevents an admin
price, stock or retirement change from disagreeing with the configurator.

**The compatibility engine runs in the browser.** The configurator re-checks a
build on every click, and a round trip per click would make it feel broken. The
API runs the same engine on the same input when a quote is submitted, so the
browser's answer is a preview and the server's is the one recorded. A caller who
posts a fabricated summary gets the real numbers stored against their request.

One compiled copy, two consumers, no second definition to drift.

## Security, concretely

**Sessions are opaque tokens in a table, not JWTs.** A JWT cannot be withdrawn;
revoking one means keeping a list of the revoked, which is a session table with
extra steps and a worse failure mode. Signing out deletes a row and takes effect
immediately, and so does disabling an account.

**The cookie is httpOnly.** Page scripts cannot read it, so a cross-site script
on this origin still cannot walk off with a usable credential.

**Two headers, two different questions.** `x-internal-key` says the request came
from the web tier; `Authorization: Bearer` says which user it acts as. Passing
one does not imply the other, which is why roles are checked separately. The
internal key is compared in constant time, because a plain `===` leaks how much
of it was right through how long the comparison took.

**Sign-in takes the same time whether or not the account exists.** A missing
account is verified against a throwaway hash, so the response time does not
enumerate the user list. The message is identical either way.

**Validation refuses rather than ignores.** The global pipe runs with
`whitelist` and `forbidNonWhitelisted`, so posting `role: "admin"` alongside a
registration is a 400, not a quiet success. Proven in the test suite.

**SQL is parameterised, and column names come from allowlists.** Values travel
as `$1`, `$2`. Update statements build `SET` clauses from a fixed set of column
names, never from the caller's keys, because parameterising a value does not
help if the identifier came from the request.

**Uploads are identified by their bytes.** The `Content-Type` and the filename
are whatever the client chose to send, so the format is read from the file
header instead. Only JPEG, PNG and WebP get through, 8MB each, twelve per
product.

**Object keys are never accepted from a caller.** A photograph is fetched by row
id; the API looks the row up and reads the key off it. There is no shape of URL
that addresses arbitrary objects in the bucket.

**Errors do not leak.** One filter turns everything into a predictable shape,
and an unexpected error becomes "Something went wrong" plus a reference. The
real message and stack are logged against that reference, so support can find it
without a Postgres error naming columns and constraints having been on screen.

**Rate limits where they matter.** 300 requests a minute across the API, 5 for
sign-in, 3 for registration, 5 for quote submission. Registered before the auth
guard, so a flood is turned away before any of it reaches the database.

**Neither application container runs as root.**

## Running it

```
cp .env.example .env     # then change every value
docker compose up -d --build
```

Nothing has a working default. A stack that starts with a blank password
because somebody did not read this file is worse than one that refuses to start,
so compose fails loudly on a missing secret.

`docker-compose.dev.yml` publishes the database, MinIO and API ports on
localhost for development. Use `npm run up` for the safer default, or
`npm run up:dev` when host access to those services is required.

## What is deliberately not here

**No ORM.** The schema is five tables and the queries are the interesting part.
An ORM would hide the joins behind an abstraction the team would have to learn
twice, once to write and once to work out what it emitted.

**No migration tool.** Every statement is `CREATE ... IF NOT EXISTS`, applied at
boot. Anything that cannot be expressed that way goes in a guarded block at the
bottom of `schema.sql` and skips itself once applied. This is honest at five
tables and will need replacing before it is fifteen.

**No CORS.** Nothing calls the API from a browser. The web tier calls it server
to server, and it is not published outside the compose network.

**No CDN in front of the image proxy.** The immutable cache headers are there so
one can be dropped in front without changing anything.
