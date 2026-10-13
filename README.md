# My Pet Space

Pet hotel and grooming booking system.
React (Vite) + Ant Design on the front end, Express + MongoDB on the back end.

Needs Node.js 20.19 or newer and a MongoDB database (MongoDB Atlas or a local MongoDB).

## First-time setup

```bash
# 1) website packages (in this folder)
npm install

# 2) server packages
cd server
npm install
```

Create `server/.env` by copying `server/.env.example`, then fill it in
(the `.env` file is never uploaded to GitHub, so every person makes their own).

## Run it (two terminals, both stay open)

```bash
# terminal 1: API server  ->  http://localhost:8000
cd server
npm run dev

# terminal 2: website     ->  http://localhost:3000
npm run dev
```

The server terminal should print `injected env (7)`, `MongoDB connected`,
and `Admin account created` the first time.
If you change `.env`, type `rs` in the server terminal to restart it.

## Accounts

- Register on the website: creates a customer (Fur Parent).
- The first Admin is created from `ADMIN_IDENTIFIER` and `ADMIN_PASSWORD` in `server/.env`.
- Admins create Staff and Groomer accounts with `POST /api/createStaff`.

## Folders

```
index.html, vite.config.js, package.json   website setup (Vite)
src/                                       website code
  auth.js                                  saves the login token
  components/Landing, Auth, Dashboard      pages
server/                                    API (its own package.json)
  server.js, models/, controllers/, routes/, middleware/
```

Never run `npm init -y` in either folder.
