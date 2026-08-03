import "dotenv/config";

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import productRouter from "./routes/productRouter";
import orderRouter from "./routes/orderRouter";
import budgetRouter from "./routes/budgetRouter";
import authRouter from "./routes/authRouter";
import errorHandler from "./middlewares/errorHandler";
import AppError from "./utils/appError";
import cartRouter from "./routes/cartRouter";

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use("/api/products", productRouter);
app.use("/api/orders", orderRouter);
app.use("/api/budgets", budgetRouter);
app.use("/api/cart", cartRouter);
app.use("/api/auth", authRouter);
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
