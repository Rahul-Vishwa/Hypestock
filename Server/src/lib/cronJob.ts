import cron from "node-cron";
import { prismaClient } from "../db/db";
import { io } from "../socket/websocket";
import { Event } from "@prisma/client";
import { asks, bids, price } from "../routes/order";
import getDate from "../common/common";

export function registerCronJobs(){
  todaysEvents();
}

const timeout = new Map<string, NodeJS.Timeout>();

async function todaysEvents() {
  cron.schedule('*/1 * * * *', async () => {
    const events = await prismaClient.event.findMany({
      where: {
        date: new Date().toISOString().split('T')[0],
        status: true
      }
    });

    for (let event of events){
      const timeDifference = getTimeDifference(event.startTime);

      if (timeDifference > 0){
        const timeoutId = setTimeout(() => {
          io.emit('eventStarted');
          
          bids.set(event.id, []);
          asks.set(event.id, []);
          price.set(event.id, []);

          setEndTimeTimeOut(event);
        }, timeDifference);
        
        timeout.set(event.id, timeoutId);
      }
    }
  })
}

function setEndTimeTimeOut(event: Event){
  const timeDifference = getTimeDifference(event.endTime);

  if (timeDifference > 0){
    const timeoutId = setTimeout(() => {
      io.emit('eventEnded');

      bids.delete(event.id);
      asks.delete(event.id);
      price.delete(event.id);

      timeout.delete(event.id);
    }, timeDifference);
    
    timeout.set(event.id, timeoutId);
  }
}

function getTimeDifference(time24hr: string) {
  const endTime = getDate(time24hr);
  return endTime.getTime() - Date.now();
}