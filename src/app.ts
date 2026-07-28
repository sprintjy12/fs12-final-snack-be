import "dotenv/config";

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
<<<<<<< HEAD
import cartController from "./controllers/cartController";
=======
import productRouter from "./routes/productRouter";
>>>>>>> 8161a7dc580260cea705d87c5e422d72c06da5a8
import orderRouter from "./routes/orderRouter";
import productRoute from "./routes/productRoute";
import errorHandler from "./middlewares/errorHandler";
import AppError from "./utils/appError";

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());
app.use(cookieParser());

<<<<<<< HEAD
app.use("/products", productRoute);
app.use("/carts", cartController);
=======
app.use("/products", productRouter);
>>>>>>> 8161a7dc580260cea705d87c5e422d72c06da5a8
app.use("/orders", orderRouter);

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
