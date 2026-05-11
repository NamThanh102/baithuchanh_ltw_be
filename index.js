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

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "photo-sharing-secret",
      resave: false,
      saveUninitialized: false,
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

    if (request.session && request.session.userId) {
      return next();
    }

    return response.status(401).json({ message: "Unauthorized" });
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
