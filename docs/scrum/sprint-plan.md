# Sprint plan

| Sprint | Goal | Tasks |
|---|---|---|
| 1 | Foundation and menu | 1 Project setup · 2 GET /products · 3 Menu page · 4 Product detail |
| 2 | Cart, orders, login | 5 Cart · 6 POST /orders · 7 Auth (JWT) |
| 3 | Payment, handover, advanced backend | 8 Payment · 9 Confirmation + history + docker · 10 Order state machine, idempotency, stock, loyalty |

Update the burndown (story points left) at the end of each day in [burndown.md](burndown.md).

## Task status

Each task is 1 story point. Status is as of the final sweep (branch `chore/final-readme-dod`, which contains all tasks).

| Task | Title | Status | Branch |
|---|---|---|---|
| 1 | Project setup | Done | `main` (commit `199a682`, initial setup) |
| 2 | GET /products | Done | `feat/task-02-products-api`, `feat/task-02c-prisma-postgres` |
| 3 | Menu page | Done | `feat/task-03-menu-page` |
| 4 | Product detail | Done | `feat/task-04-product-detail` |
| 5 | Cart | Done | `feat/task-05-cart` |
| 6 | POST /orders | Done | `feat/task-06-orders-api` |
| 7 | Auth (JWT) | Done | `feat/task-07-auth-jwt` |
| 8 | Payment | Done | `feat/task-08-payments` |
| 9 | Confirmation + history + docker | Done | `feat/task-09a-orders-me-docker`, `feat/task-09b-frontend-auth`, `feat/task-09b2-checkout-orders` |
| 10 | Order state machine, idempotency, stock, loyalty | Done | `feat/task-10a-state-machine-idempotency`, `feat/task-10b-stock-concurrency`, `feat/task-10c-vouchers-loyalty` |

Final sweep: `chore/final-readme-dod` (README, Definition of Done, burndown template, verification).
