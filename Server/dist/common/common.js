"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getDate;
exports.compareDates = compareDates;
function getDate(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date;
}
function compareDates(date1, date2, type) {
    const dateFirst = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const dateSecond = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
    if (type === 'equal') {
        return dateFirst === dateSecond;
    }
    else
        return dateFirst < dateSecond;
}
