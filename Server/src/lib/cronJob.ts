import cron from "node-cron";
import { prismaClient } from "../db/db";
import { io } from "../socket/websocket";
import { Event } from "@prisma/client";
import { asks, bids, price, sendOrderBook } from "../routes/order";
import getDate from "../common/common";

export function registerCronJobs(){
  todaysEvents();
}

export const timeout = new Map<string, NodeJS.Timeout>();

async function todaysEvents() {
  // Change this to daily at 12am
  cron.schedule('*/1 * * * *', async () => {
    // uncomment this on 24hrs cron job
    // timeout.clear();
    const events = await prismaClient.event.findMany({
      where: {
        date: new Date().toISOString().split('T')[0],
        status: true
      }
    });

    for (let event of events){
      setStartTimeTimeOut(event.id, event.startTime, event.endTime);
    }
  })
}

export function setStartTimeTimeOut(id: string, startTime: string, endTime: string) {
  const timeDifference = getTimeDifference(startTime);

  if (timeDifference > 0){
    const timeoutId = setTimeout(() => {
      io.emit('eventStarted');
      
      bids.set(id, []);
      asks.set(id, []);
      price.set(id, []);

      setEndTimeTimeOut(id, startTime, endTime);
    }, timeDifference);
    
    timeout.set(id, timeoutId);
  }
}

function setEndTimeTimeOut(id: string, startTime: string, endTime: string){
  const timeDifference = getTimeDifference(endTime);

  if (timeDifference > 0){
    const timeoutId = setTimeout(async () => {
      io.emit('eventEnded');

      bids.delete(id);
      asks.delete(id);
      price.delete(id);

      sendOrderBook(id);

      timeout.delete(id);
    }, timeDifference);
    
    timeout.set(id, timeoutId);
  }
}

function getTimeDifference(time24hr: string) {
  const endTime = getDate(time24hr);
  return endTime.getTime() - Date.now();
}