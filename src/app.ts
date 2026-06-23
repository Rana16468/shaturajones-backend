import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";

import config from "./app/config";
import router from "./router";

import notFound from "./middleware/notFound";
import globalErrorHandelar from "./middleware/globalErrorHandelar";

import PaymentGatewayController from "./module/payment_gateway/payment_gateway.controller";
import cron from 'node-cron';
import handle_unpaid_payment from "./utility/handle_unpaid_payment";
import handle_incomplete_services from "./utility/handle_incomplete_services";
import auto_delete_unverified_user from "./utility/auto_delete_unverified_user";
import monitorRouter from "./utility/metrics/metricsMiddleware";
import systemArtc from "./utility/metrics/systemArtc";

const app = express();

/* =========================
   🌐 CORS
========================= */
app.use(cors());
app.use(cookieParser());


app.post(
  "/api/v1/payment_gateway/webhook",
  express.raw({ type: "application/json" }),
  PaymentGatewayController.handleWebhook
);

/* =========================
   📦 NORMAL BODY PARSERS
   (AFTER WEBHOOK ONLY)
========================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


cron.schedule("*/30 * * * *", async () => {
  try {
    await handle_unpaid_payment();
  } catch (error: any) {
    console.error(error);
  }
});
cron.schedule("*/30 * * * *", async()=>{
    try{
      await handle_incomplete_services()
    }
    catch (error: any) {
    console.error(error);
  }
});

// Runs every 30 minutes
cron.schedule('*/30 * * * *', async () => {
 
 try{
   await auto_delete_unverified_user();

 }
 catch (error: any) {
    console.error(error);
  }
});


app.use(
  config.file_path as string,
  express.static(path.join(__dirname, "public"))
);


app.get("/", (_req, res) => {
  res.send(systemArtc());
});


app.use("/api/v1", router);
app.use("/api/v1/monitor", monitorRouter); // ← metrics endpoint


app.use(notFound);
app.use(globalErrorHandelar);

export default app;