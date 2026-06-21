import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import path from "path";
const dashboardFilePath = path.resolve(process.cwd(), "src/views/html/index.html");
const dashboardAssetsPath = path.resolve(process.cwd(), "src/views");
import routes from "./http/routes/routes.js";

const app = express();

app.use(cors({
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
}));

app.use(express.json());
app.use(helmet());
app.use(compression());
app.use("/dashboard-assets", express.static(dashboardAssetsPath));

app.use("/", routes);

app.get("/dashboard", (req, res) => {
  res.sendFile(dashboardFilePath);
});

app.listen(3012, '0.0.0.0', () => {
    console.clear();
    console.log("Servidor rodando em http://0.0.0.0:3012");
});

export default app;
