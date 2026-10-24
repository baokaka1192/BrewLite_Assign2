# BrewLite

Cashless coffee ordering app — Software Engineering assignment (Saigon University, 2026–2027).
Stack: **Next.js 14** (frontend) · **NestJS 10** (backend) · **PostgreSQL** · Docker Compose.

## Folder structure

```
brewlite/
├── apps/
│   ├── backend/                    NestJS REST API  (http://localhost:4000/api)
│   │   ├── src/
│   │   │   ├── main.ts             bootstrap: prefix /api, CORS, ValidationPipe
│   │   │   ├── app.module.ts       root module
│   │   │   ├── config/             typed env configuration
│   │   │   ├── prisma/             global PrismaModule + PrismaService
│   │   │   ├── common/             shared: decorators, filters, guards, interceptors, pipes
│   │   │   └── modules/            one folder per feature (controller, service, dto, entity)
│   │   │       ├── auth/           Task 7   register / login / JWT
│   │   │       ├── users/          Task 7
│   │   │       ├── products/       Task 2   GET /products
│   │   │       ├── orders/         Task 6, 9, 10  state machine, history
│   │   │       ├── payments/       Task 8, 10     mock gateway, idempotency
│   │   │       └── promotions/     Task 10  vouchers, loyalty points
│   │   ├── prisma/                 schema, migrations, seed.ts (Prisma + PostgreSQL)
│   │   └── test/                   e2e tests
│   └── frontend/                   Next.js App Router  (http://localhost:3000)
│       ├── public/images/          photos for the landing page
│       └── src/
│           ├── app/                routes: layout, page (landing), menu, later cart/checkout/orders
│           ├── components/
│           │   ├── ui/             base primitives (shadcn-style Button)
│           │   ├── layout/         Navbar, Footer
│           │   ├── landing/        one file per landing section
│           │   └── shared/         Reveal, AmberRule, Chip, ImageFrame, MotionProvider
│           ├── features/           feature code per domain: menu, cart, auth, checkout, orders
│           ├── content/            landing-page copy (edit text here, not in components)
│           ├── lib/                api client, utils, formatVND
│           ├── hooks/ store/ types/
├── docs/scrum/                     sprint plan, Definition of Done
├── docker-compose.yml              db + backend + frontend
├── .env.example
└── package.json                    helper scripts
```

Rule of thumb: **routes in `app/`, UI pieces in `components/`, business code for one domain in `features/` (frontend) or `modules/` (backend).**

## Run locally

```bash
cp .env.example .env
npm run install:all
npm run dev:backend      # http://localhost:4000/api  -> { "message": "Hello from BrewLite API" }
npm run dev:frontend     # http://localhost:3000
```

The frontend calls the API at `NEXT_PUBLIC_API_URL` (default `http://localhost:4000/api`); override it in `apps/frontend/.env.local` if the backend runs elsewhere.

## Database (PostgreSQL + Prisma)

The backend stores data in PostgreSQL through Prisma. Schema: `apps/backend/prisma/schema.prisma`.

Two databases live in the same compose Postgres container:

| Env var | Database | Used by |
| ------- | -------- | ------- |
| `DATABASE_URL` | `brewlite` | dev server, `prisma migrate`, `prisma db seed` |
| `DATABASE_URL_TEST` | `brewlite_test` | e2e tests only (migrated and seeded automatically) |

```bash
cp .env.example .env                       # root (compose) and
cp apps/backend/.env.example apps/backend/.env   # backend (Prisma CLI reads this one)

docker compose up -d db                    # Postgres 16 on localhost:5432, waits for healthcheck
cd apps/backend
npm install
npx prisma migrate dev                     # create/apply migrations locally (dev only)
npx prisma migrate deploy                  # apply existing migrations (CI / fresh DB)
npm run prisma:seed                        # upsert the 10 seed products (idempotent)
```

`brewlite_test` is created by `docker/postgres/init/01-create-test-db.sql`, which only runs when the
`db-data` volume is first created. If the volume already exists, create it once by hand:

```bash
docker compose exec db psql -U brewlite -d brewlite -c "CREATE DATABASE brewlite_test OWNER brewlite;"
```

Reset the dev database (drops all data): `cd apps/backend && npx prisma migrate reset`.

## Tests

```bash
cd apps/backend
npm test            # unit tests, PrismaService is mocked (no database needed)
npm run test:e2e    # needs the db container; migrates + seeds brewlite_test in beforeAll
npm run build       # runs prisma generate, then nest build
```

`npm test`, `npm run build` and `npm run test:e2e` run `prisma generate` first, so the client is always in sync with the schema.

## API endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/api/products` | List products. Optional `?category=coffee\|tea\|pastry` (400 on any other value). |
| GET | `/api/products/:id` | Get one product, or 404 if it does not exist. |
| POST | `/api/orders` | Create a PENDING order from a cart `{items:[{productId, size?, toppingIds?, qty}], note?}`. Totals are computed server-side. Returns 201 with the order id and total; 400 on invalid input, 404 on unknown product, 409 when qty exceeds stock. |

Menu photos: Unsplash, credits in [apps/frontend/public/images/menu/CREDITS.md](apps/frontend/public/images/menu/CREDITS.md).

## Run with Docker

```bash
cp .env.example .env
docker compose up --build
```

## Design system

Colors, fonts and tokens are in `apps/frontend/src/app/globals.css` and `tailwind.config.ts`
(Playfair Display + DM Sans, espresso / amber / cream). Landing images are placeholders until files are
added to `public/images` and passed as `src` to `ImageFrame`.

## Git workflow

Branch per task (`feat/task-02-products-api`), small commits, review before merging to `main`.
