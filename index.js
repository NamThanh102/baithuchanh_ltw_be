const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");
const session = require("express-session");
const dbConnect = require("./db/dbConnect");
const UserRouter = require("./routes/UserRouter");
const PhotoRouter = require("./routes/PhotoRouter");
const AdminRouter = require("./routes/AdminRouter");
const seedInitialData = require("./db/seedInitialData");

app.get("/", (request, response) => {
  response.send({ message: "Hello from photo-sharing app API!" });
});

(async () => {
  await dbConnect();
  await seedInitialData();

  const allowedOrigins = new Set(
    (process.env.CORS_ORIGINS || "http://localhost:3000,https://8k73q9-3000.csb.app,https://9vvd5k-3000.csb.app")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  );

  const corsOptions = {
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    optionsSuccessStatus: 200,
  };

  app.use((request, response, next) => {
    const origin = request.headers.origin;
    if (!origin || allowedOrigins.has(origin)) {
      if (origin) {
        response.header("Access-Control-Allow-Origin", origin);
        response.header("Vary", "Origin");
      }
      response.header("Access-Control-Allow-Credentials", "true");
      response.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin");
      response.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
      response.header("Access-Control-Expose-Headers", "Set-Cookie, Content-Type");
    }

    if (request.method === "OPTIONS") {
      return response.sendStatus(204);
    }

    return next();
  });

  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "photo-sharing-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "none",
        secure: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  app.use("/images", express.static(path.join(__dirname, "images")));

  app.use((request, response, next) => {
    if (request.method === "OPTIONS") {
      return next();
    }

    if (request.path === "/" || request.path.startsWith("/images/")) {
      return next();
    }

    if (request.path === "/admin/login" || request.path === "/admin/logout") {
      return next();
    }

    if (request.path === "/admin/me") {
      return next();
    }

    if (request.path === "/user" && request.method === "POST") {
      return next();
    }

    // For all other paths, verify JWT token
    const token = request.headers.authorization?.split(" ")[1];
    if (!token) {
      return response.status(401).json({ message: "Unauthorized" });
    }

    try {
      const jwt = require("jsonwebtoken");
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "photo-sharing-jwt-secret");
      request.user = decoded;
      return next();
    } catch (error) {
      return response.status(401).json({ message: "Invalid token" });
    }
  });

  app.use("/admin", AdminRouter);
  app.use("/user", UserRouter);
  app.use("/", PhotoRouter);

  app.listen(8081, () => {
    console.log("server listening on port 8081");
  });
})().catch((error) => {
  console.error("Failed to start server", error);
});
