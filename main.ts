import express from 'express';
import cors from "cors"
import * as sandbox from "./service/sandbox.js"
import * as socket from "./service/socket.js"
import {createServer} from 'node:http';
import { updateNotifications } from './service/database.js';
import { LongIntervalJob, SimpleIntervalJob, Task, ToadScheduler } from 'toad-scheduler';

const serverPort = process.env.SERVER_PORT || 5000

//run server powered by express with socket.io
export const app = express();
app.use(cors({origin: "*"}))
const server = createServer(app);

server.listen(serverPort, () => {
  console.log(`server running at http://localhost:${serverPort}`);
});


sandbox.init()
socket.init(server)



updateNotifications()

//update expirations
const scheduler = new ToadScheduler();
const task = new Task('Expiration Check', () => updateNotifications());
const job = new LongIntervalJob({ minutes: 5, runImmediately: true },task)
scheduler.addLongIntervalJob(job)