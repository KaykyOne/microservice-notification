import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import routes from "./http/routes/routes.js";

const PORT = process.env.PORT || 3012;
const app = express();

app.use(cors({
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
}));

app.use(express.json());
app.use(helmet());
app.use(compression());

app.use("/", routes);

app.listen(PORT, () => {
    console.clear();
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});

export default app;
