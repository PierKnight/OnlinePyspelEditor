import express from 'express';
import cors from "cors"
import * as sandbox from "./sandbox.js"
import * as socket from "./socket.js"
import {createServer} from 'node:http';


const serverPort = 5000

//run server powered by express with socket.io
export const app = express();
app.use(cors({origin: "*"}))
const server = createServer(app);

server.listen(serverPort, () => {
  console.log(`server running at http://localhost:${serverPort}`);
});


sandbox.init()

socket.init(server)


 
