# StayEase

StayEase is a full-stack property listing application built with Node.js, Express, MongoDB, EJS and Passport.

## Features

- User signup/login/logout
- Session-based authentication
- Add property listings
- Edit/delete your own listings
- Property detail pages
- Add/delete your own reviews
- Flash messages and validation
- Responsive Bootstrap UI
- MongoDB persistence
- Protected owner-only edit/delete actions

## Project structure

```text
StayEase-main/
├── app.js
├── middleware.js
├── models/
│   ├── listing.js
│   ├── Review.js
│   └── user.js
├── utils/
│   ├── ExpressErr.js
│   └── wrapAsync.js
├── views/
│   ├── layouts/
│   ├── partials/
│   └── users/
├── public/
│   ├── css/
│   └── js/
├── .env.example
├── .gitignore
└── package.json
```

## Requirements

- Node.js 18+
- MongoDB running locally, or a MongoDB Atlas connection string

## Run locally

1. Open a terminal in the project folder.
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env` and update the values if required.

4. Make sure MongoDB is running.

5. Start the app:

```bash
npm start
```

For development with automatic restart:

```bash
npm run dev
```

6. Open `http://localhost:8080`.

## Notes

The application uses a local MongoDB database named `StayEase` by default. The first user can create an account and then add properties.

For production deployment, use a secure random `SESSION_SECRET`, a production MongoDB database, HTTPS, and a persistent session store instead of Express's default in-memory session store.
