export default function convertTo12hFormat(time24hr: string) {
    let [hour, minute] = time24hr.split(':').map(Number);

    const period = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;

    const paddedMinute = minute.toString().padStart(2, '0');
    return `${hour}:${paddedMinute} ${period}`;
}

export function getDate(timeStr: string) {
    const [ hours, minutes ] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(0);
    date.setMilliseconds(0);

    return date;
}