import "dotenv/config";

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import productRouter from "./routes/productRouter";
import categoryRouter from "./routes/categoryRouter";
import orderRouter from "./routes/orderRouter";
import budgetRouter from "./routes/budgetRouter";
import authRouter from "./routes/authRouter";
import userRouter from "./routes/userRouter";
import invitationRouter from "./routes/invitationRouter";
import errorHandler from "./middlewares/errorHandler";
import AppError from "./utils/appError";
import cartRouter from "./routes/cartRouter";
import uploadRouter from "./routes/uploadRouter";

const app = express();
const port = Number(process.env.PORT) || 3000;

const frontendUrl = process.env.FRONTEND_URL;

if (!frontendUrl) {
  throw new Error(
    "FRONTEND_URL 환경변수가 설정되지 않았습니다.",
  );
}

let frontendOrigin: string;

try {
  const parsedUrl = new URL(frontendUrl);

  if (
    parsedUrl.protocol !== "http:" &&
    parsedUrl.protocol !== "https:"
  ) {
    throw new Error(
      "FRONTEND_URL은 http 또는 https 프로토콜만 사용할 수 있습니다.",
    );
  }

  frontendOrigin = parsedUrl.origin;
} catch (error) {
  if (error instanceof Error && error.message.includes("프로토콜")) {
    throw error;
  }

  throw new Error(
    "FRONTEND_URL 환경변수가 올바른 URL 형식이 아닙니다.",
  );
}

app.use(
  cors({
    origin: frontendOrigin,
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());
app.use("/api/products", productRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/orders", orderRouter);
app.use("/api/budgets", budgetRouter);
app.use("/api/cart", cartRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/invitations", invitationRouter);
app.use("/api/upload", uploadRouter);
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use((_req, _res, next) => {
  next(new AppError("요청한 리소스를 찾을 수 없습니다.", 404, "NOT_FOUND"));
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
