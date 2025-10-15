import express from "express";
import projectsRouter from "./routes/projects";
import adminsRouter from "./routes/admins";
import photosRouter from "./routes/photos";

const app = express();
app.use(express.json());

// All routes share the same base prefix:
app.use("/api", projectsRouter);
app.use("/api", adminsRouter);
app.use("/api", photosRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ API running at http://localhost:${PORT}`);
});
