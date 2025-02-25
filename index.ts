import "dotenv/config";
import express, { Express, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import morgan from "morgan";
import cors from "cors";
// Routes
import usersRouter from "./routes/users";
import { checkEnvVariables } from "./utils";
import profileRouter from "./routes/profile";
import resumeRouter from "./routes/resume";

export const app: Express = express();
export const prisma = new PrismaClient();

app.use(morgan("dev"));
app.use(
  cors({
    origin: "https://cdl-resume-writer.vercel.app/"
  })
);
app.use(
  express.json({
    limit: "100mb",
  })
);
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*")
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested, Content-Type, Accept Authorization"
  )
  if (req.method === "OPTIONS") {
    res.header(
      "Access-Control-Allow-Methods",
      "POST, PUT, PATCH, GET, DELETE"
    )
    return res.status(200).json({})
  }
  next()
})

app.get("/", (req: Request, res: Response) => {
  res.send("Server is running... 🏃");
});

app.get('/healthCheck', (req, res) => {
  res.status(200).send('Healthy');
});

app.use("/users", usersRouter);
app.use("/profiles", profileRouter);
app.use("/resumes", resumeRouter);

const serve = async () => {
  try {
    checkEnvVariables();

    console.log("💡 Setting up ORM...");

    await prisma.$connect();

    const server = app.listen(process.env.PORT || 4000, () => {
      console.log(
        `⚡️ Server is running at http://localhost:${process.env.PORT || 4000}`
      );
    });

    server.timeout = 1000 * 60 * 10;
  } catch (error: any) {
    console.log(error?.response?.data || error);
  } finally {
    await prisma.$disconnect();
  }
};

serve();
