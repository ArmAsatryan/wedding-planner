# Հարսանիքի Պլանավորող (Wedding Planner)

Լիարժեք վեբ հավելված հարսանիքի պլանավորման, ծախսերի, հյուրերի, հրավերների և ժամանակացույցի կառավարման համար։

## Հնարավորություններ

- **Հիմնական տեղեկություն** — հարսի/փեսայի անուն, ամսաթիվ, բյուջե
- **Հյուրերի կառավարում** — հարսի/փեսայի կողմ, RSVP կարգավիճակ
- **Ծախսերի հաշվառում** — 15 կատեգորիա, վճարված/չվճարված
- **Սեղանների պլանավորում** — ձեռքով և ավտոմատ բաշխում
- **Հրավերների գեներատոր** — PDF/PNG արտահանում
- **Ժամանակացույց** — քրոնոլոգիական հերթականություն, քարտեզ
- **Համահեղինակներ** — Owner, Editor, Viewer դերեր
- **Վահանակ** — ամփոփ վիճակագրություն

## Տեխնոլոգիաներ

| Շերտ | Stack |
|------|-------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express, Prisma |
| Database | PostgreSQL |
| Auth | JWT (email/password) |

## Արագ մեկնարկ

### Պահանջներ

- Node.js 20+
- Docker (PostgreSQL-ի համար)

### Տեղադրում

```bash
# 1. Կախվածություններ
cd wedding-planner
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 2. Backend կարգավորում
cp backend/.env.example backend/.env

# 3. Database
docker compose up -d
cd backend
npx prisma db push
npm run db:seed
cd ..

# 4. Գործարկում
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

### Demo հաշիվ

| Դաշտ | Արժեք |
|------|-------|
| Էլ. փոստ | `demo@wedding.am` |
| Գաղտնաբառ | `password123` |

## Deploy

Free stack: **GitHub** (code) + **Neon** (database) + **Render** (backend) + **Cloudflare Pages** (frontend).

### One-command deploy

```bash
# 1. Log in to GitHub once
gh auth login

# 2. Create Neon DB at https://neon.tech and copy DATABASE_URL

# 3. Deploy
DATABASE_URL="postgresql://..." \
CLOUDFLARE_API_TOKEN="..." \
./scripts/deploy.sh
```

The script pushes to GitHub, guides Render setup, and deploys the frontend to Cloudflare Pages.

### Manual steps

#### Backend (Render)

1. Connect GitHub repo at [Render Blueprint](https://dashboard.render.com/select-repo?type=blueprint)
2. Set `DATABASE_URL`, `FRONTEND_URL`, `JWT_SECRET`
3. After deploy, open Render Shell and run: `npm run db:seed`

#### Frontend (Cloudflare Pages)

```bash
cd frontend
VITE_API_URL=https://your-api.onrender.com/api npm run build
npx wrangler pages deploy dist --project-name wedding-planner
```

Or connect GitHub in Cloudflare Pages dashboard:
- Root: `frontend`
- Build: `npm ci && npm run build`
- Output: `dist`
- Env: `VITE_API_URL=https://your-api.onrender.com/api`

#### Database (Neon)

Create free PostgreSQL at [neon.tech](https://neon.tech) and use the connection string as `DATABASE_URL`.

### Environment variables

| Service | Variable | Example |
|---------|----------|---------|
| Backend | `DATABASE_URL` | Neon connection string |
| Backend | `JWT_SECRET` | random 32+ char string |
| Backend | `FRONTEND_URL` | `https://wedding-planner.pages.dev` |
| Frontend | `VITE_API_URL` | `https://your-api.onrender.com/api` |

## Նավիգացիա

- Վահանակ
- Հյուրեր
- Ծախսեր
- Սեղաններ
- Հրավերներ
- Ժամանակացույց
- Կարգավորումներ / Համահեղինակներ
