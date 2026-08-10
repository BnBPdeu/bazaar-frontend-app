import session from "express-session";

if (!process.env.SESSION_SECRET) {
  console.error("SESSION_SECRET is not set");
  process.exit(1);
}

export const sessionConfig = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 100 },
});