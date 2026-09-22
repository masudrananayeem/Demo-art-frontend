# Art-Canvas-Frontend

The ArtCanvas storefront (React + Vite + Tailwind). Talks to
`Art-Canvas-backend` for products, orders and admin actions, and to
Firebase Authentication directly for sign-in/sign-up.

## 1. Set up the backend first

This app needs `Art-Canvas-backend` running (locally or deployed) — follow
`../Art-Canvas-backend/README.md` first to create the Firebase project,
Cloudinary account, and get an API URL.

## 2. Configure

```bash
cd Art-Canvas-Frontend
npm install
cp .env.example .env
```

Fill in `.env` with:
- The **same Firebase project's** web app config (Firebase Console →
  Project settings → Your apps → Web app — if you haven't added a web app
  yet, add one here; it's free and instant).
- `VITE_API_BASE_URL` — your backend's URL (`http://localhost:8787` while
  developing, or your deployed Workers URL).

## 3. Run locally

```bash
npm run dev
```

Opens at `http://localhost:5173`. Sign up for an account, then follow the
backend README's "make yourself an admin" step to unlock the `/admin`
dashboard (a shield icon appears in the navbar once you are one).

## 4. What's in the app

- **Everyone:** browse `/shop`, view products (including Art, browsable at
  `/gallery`), add to bag.
- **Signed-in users:** `/account` — editable profile (photo, name, phone,
  address), full purchase history. `/checkout` — a dedicated checkout page
  that collects shipping details (prefilled from their saved profile) and a
  payment method: Cash on Delivery, bKash, or Nagad (with transaction ID).
  Placing an order calls the backend, which validates and decrements real
  stock.
- **Admins:** `/admin`, with five tabs:
  - **Products** — add products in any category (clothing, art, objects,
    accessories, gifts, or any category you've added) with price, stock,
    and an image uploaded straight to Cloudinary. Art/objects/accessories
    get a free-text "medium / style" field instead of the clothing size
    dropdowns. Edit price/stock inline, star a product to feature it on the
    homepage, or delete it — every change shows up across the whole site
    immediately, not just in the dashboard.
  - **Categories** — add a new category (just type a name) or delete one
    you added. The 5 default categories can't be deleted; a custom one
    can't be deleted while products still use it, to avoid orphaning them.
  - **Sub-categories** — same idea, but for the Women/Men/Children
    clothing sub-categories (Dresses, Shirts, etc.). Add or remove per
    gender; the built-in ones can't be removed.
  - **Orders** — every order placed, with shipping details and payment
    method.
  - **Home** — upload the homepage hero image and edit its headline/
    tagline; leave empty to keep the default.
  
  Products with 0 stock automatically show "Out of Stock" to shoppers
  instead of a quantity.

## 5. Deploy to Cloudflare Pages

```bash
npm run build
```

This produces `dist/`. Either:

**Via the dashboard:** Cloudflare Dashboard → Workers & Pages → Create →
Pages → connect your git repo, set:
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `Art-Canvas-Frontend` (since both apps live in the same
  repo)
- Add the same environment variables as `.env` under **Settings →
  Environment variables** (all `VITE_...` ones, pointing `VITE_API_BASE_URL`
  at your deployed backend Workers URL).

**Via Wrangler CLI:**
```bash
npx wrangler pages deploy dist --project-name=art-canvas-frontend
```

After deploying, add the Pages URL (e.g.
`https://art-canvas-frontend.pages.dev`) to the backend's
`ALLOWED_ORIGINS` in `Art-Canvas-backend/wrangler.toml`, then redeploy the
backend so CORS allows it.
