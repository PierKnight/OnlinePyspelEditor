import express from 'express';
import cors from "cors"
import * as sandbox from "./sandbox.js"
import * as socket from "./socket.js"
import {createServer} from 'node:http';
import { PipRequest, PipCommand, isSomeEnum } from './model.js';
import { get, insert } from './database.js';
import { NotFoundError } from '@prisma/client/runtime/library.js';



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


