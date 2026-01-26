import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

// App Config
process.loadEnvFile();
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({
    origin: process.env.APP_URL,
    credentials: true,
}));

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});
