import express from 'express';
import cors from 'cors';
import notFound from './middleware/notFound';
import globalErrorHandelar from './middleware/globalErrorHandelar';
import router from './router';
import cookieParser from "cookie-parser";
const app = express();

app.use(express.json());
//middlewere
//credentials:true
//https://shoes-client.vercel.app
app.use(cors());


app.use(cookieParser());


app.get('/', (req, res) => {
  res.send({ status: true, message: 'Well Come To shaturajones-backend Server' });
});

app.use('/api/v1', router);

app.use(notFound);
app.use(globalErrorHandelar);

export default app;
