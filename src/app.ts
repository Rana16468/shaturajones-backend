import express from 'express';
import cors from 'cors';
import notFound from './middleware/notFound';
import globalErrorHandelar from './middleware/globalErrorHandelar';
import router from './router';
import cookieParser from "cookie-parser";
import config from './app/config';
import path from 'path'
const app = express();

app.use(express.json());
//middlewere
//credentials:true
//https://shoes-client.vercel.app
app.use(cors());




app.use(cookieParser());


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
