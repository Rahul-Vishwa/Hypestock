"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getDate;
function getDate(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date;
}
