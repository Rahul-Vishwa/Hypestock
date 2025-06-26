import cron from "node-cron";
import { prismaClient } from "../db/db";
import { io } from "../socket/websocket";
import { asks, bids, price, saveHoldings, savePricePoints, sendOrderBook, unlockBalanceForEvent } from "../routes/order";
import getDate from "../common/common";
import { Status, updateStatus } from "../routes/event";

export function registerCronJobs(){
  todaysEvents();
}

async function todaysEvents() {
  startTimeouts();
  // Change this to daily at 12am
  cron.schedule('*/1 * * * *', () => {
    startTimeouts();
  });
}

export async function startTimeouts() {
  // uncomment this on 24hrs cron job
  // timeout.clear();
  const events = await prismaClient.event.findMany({
    where: {
      date: new Date().toISOString().split('T')[0],
    }
  });

  for (let event of events){
    setIpoTimeout(event.id, event.startTime, event.endTime);
  }
}

export const timeout = new Map<string, NodeJS.Timeout>();
export const runningIPOs = new Set();
export const runningEvents = new Set();
export const ipoMins = 1;

export function setIpoTimeout(id: string, startTime: string, endTime: string) {
  let timeDifference = getTimeDifference(startTime) - ipoMins * 60 * 1000;

  if (timeDifference > 0) {
    const timeoutId = setTimeout(async () => {
      io.emit('ipoStarted');
      runningIPOs.add(id);
      price.set(id, []);

      await updateStatus(id, Status.ipoPhase);

      setStartTimeTimeout(id, startTime, endTime);
    }, timeDifference);
    
    timeout.set(id, timeoutId);
  }
}

function setStartTimeTimeout(id: string, startTime: string, endTime: string) {
  const timeDifference = getTimeDifference(startTime);

  if (timeDifference > 0){
    const timeoutId = setTimeout(async () => {
      io.emit('eventStarted');
      runningIPOs.delete(id);
      runningEvents.add(id);
      
      bids.set(id, []);
      asks.set(id, []);
      
      await updateStatus(id, Status.started);

      setEndTimeTimeout(id, endTime);
    }, timeDifference);
    
    timeout.set(id, timeoutId);
  }
}

function setEndTimeTimeout(id: string, endTime: string){
  const timeDifference = getTimeDifference(endTime);

  if (timeDifference > 0){
    const timeoutId = setTimeout(async () => {
      io.emit('eventEnded');
      runningEvents.delete(id);

      await updateDB(id);

      bids.delete(id);
      asks.delete(id);

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

async function updateDB(id: string) {
  await savePricePoints(id);
  await updateStatus(id, Status.ended);
  await unlockBalanceForEvent(id);
  await saveHoldings(id);
}