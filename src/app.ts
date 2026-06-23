import express from 'express';
import cors from 'cors';
import notFound from './middleware/notFound';
import globalErrorHandelar from './middleware/globalErrorHandelar';
import router from './router';
import cookieParser from "cookie-parser";
import config from './app/config';
import path from 'path'
import PaymentGatewayController from './module/payment_gateway/payment_gateway.controller';
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


//middlewere
//credentials:true
//https://shoes-client.vercel.app
app.use(cors());
app.use(cookieParser());
app.post(
  "/api/v1/payment_gateway/webhook",
  express.raw({ type: "application/json" }),
  PaymentGatewayController.handleWebhook
);


app.use(
  config.file_path as string,
  express.static(path.join(__dirname, "public"))
);


app.get('/', (req, res) => {
  res.send({ status: true, message: 'Well Come To shaturajones-backend Server' });
});

app.use('/api/v1', router);

app.use(notFound);
app.use(globalErrorHandelar);

export default app;
