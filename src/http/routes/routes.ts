//* Package Imports
import { Router } from "express";

//* Route Imports
import whatsappRoutes from "./whatsapp.route.js";

const router = Router();

// Whatsapp Routes
router.use("/whatsapp", whatsappRoutes);

// Health Check Routes
router
  .get("/ping", (req, res) => {
    res.send("Pong");
  })
  .get("/", (req, res) => {
    res.send("API is running");
  });

export default router;
