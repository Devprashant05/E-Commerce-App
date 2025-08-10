import app from "./app.js";
import connectDB from "./db/index.js";
import dotenv from "dotenv";

dotenv.config({
    path: "./.env",
});

const port = process.env.PORT || 8800;

connectDB()
    .then(
        app.listen(port, () => {
            console.log(`Server is listening at PORT : ${port}`);
        })
    )
    .catch((err) => console.error(`DB Connection Failed!!! : ${err.message}`));
