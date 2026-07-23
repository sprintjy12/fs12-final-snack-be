import "dotenv/config";

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import productController from "./controllers/productController";
import cartController from "./controllers/cartController";

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use("/products", productController);
app.use("/carts", cartController);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
