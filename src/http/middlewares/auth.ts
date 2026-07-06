//* Env Imports
import env from "../../env.js";

//* Type Imports
import type { Request, Response, NextFunction } from "express";

function middleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    const secretKey = env.SECRET_KEY;

    if (!token) {
        return res.status(401).json({ message: "Token not provided" });
    }

    if (token !== secretKey) {
        return res.status(401).json({ message: "Invalid token" });
    }

    next();
}

export default middleware;