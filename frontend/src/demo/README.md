# Demo data layer

The public portfolio build has no sign-in and no backend. `lib/axios.ts` installs `demoAdapter`, which answers
every request in the browser:

- Reads come from `fixtures.json`, a snapshot of the real backend's responses after running `prisma/seed.ts`
  and creating sample sales, purchases, custom orders and users through the real API.
- `/Dashboard/GetOverview`, `/Sales/GetDashboardStats` and `/Report/GetSalesReport` are computed in `derive.ts`
  from those entities (they matched the backend's own output exactly when checked), and timestamps are moved
  forward in whole days so "today" and the 6-month chart stay current.
- Every non-GET request is rejected with 403 and a read-only message. Nothing is ever saved.
