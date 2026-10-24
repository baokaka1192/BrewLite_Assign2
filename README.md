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
│   │   │   ├── common/             shared: decorators, filters, guards, interceptors, pipes
│   │   │   └── modules/            one folder per feature (controller, service, dto, entity)
│   │   │       ├── auth/           Task 7   register / login / JWT
│   │   │       ├── users/          Task 7
│   │   │       ├── products/       Task 2   GET /products
│   │   │       ├── orders/         Task 6, 9, 10  state machine, history
│   │   │       ├── payments/       Task 8, 10     mock gateway, idempotency
│   │   │       └── promotions/     Task 10  vouchers, loyalty points
│   │   ├── prisma/                 schema + migrations (added with the ORM)
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

## API endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/api/products` | List products. Optional `?category=coffee\|tea\|pastry` (400 on any other value). |
| GET | `/api/products/:id` | Get one product, or 404 if it does not exist. |

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
