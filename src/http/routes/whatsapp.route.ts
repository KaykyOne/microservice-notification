//* Package Imports
import { Router } from "express";

//* Controller Imports
import {
    sendMessage,
} from "../controller/whatsapp.controller.js";

const router = Router();

router.post("/", sendMessage);

export default router;
