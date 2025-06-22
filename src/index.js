import dotenv from 'dotenv';
import connectingtoDB from "./db/config.js";
import {app} from "./app.js"
dotenv.config({
    path:"./.env"
});

console.log(process.env.PORT)
connectingtoDB()
.then(()=>{
    app.listen(process.env.PORT || 3000,()=>{
        console.log(`Server is running on port : ${process.env.PORT}`)
    })
    app.on("error",(error)=>{
        console.log("Something went wrong : ",error);
    })
})
.catch((err)=>{
    console.log("MONGODB connection error failed !!! : ",err);
})