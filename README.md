# Growth Analytics: a demo rebuild

The Overview tab of a Growth Analytics dashboard designed and built by Alina Kabanets at Deaku. This version is rebuilt from scratch from the designs. **Every number is invented**: no code, data or figures come from Deaku.

- Demo data is generated with a fixed seed (`lib/demo/`), so every build is identical and the page is static.
- One shared query layer (`lib/metrics.ts`) reads every number for a period, so the tiles, table, staircase and trends always agree.
- The period rules (complete UK weeks, the Thursday rule, the month in progress read to date) are pure functions with tests.
- The brand lives in one file (`lib/brand.ts`).

```
npm run dev     # local
npm test        # period rules, status thresholds, demo data
npm run lint && npm run build
```
