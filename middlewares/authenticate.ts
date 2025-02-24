import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).send({
        message: "Unauthorized",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!);

    req.body.user = decoded;

    next();
  } catch (error) {
    return res.status(401).send({
      success: false,
      message: "Unauthorized",
    });
  }
};
