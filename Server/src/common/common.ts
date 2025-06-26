export default function getDate(timeStr: string) {
    const [ hours, minutes ] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(0);
    date.setMilliseconds(0);

    return date;
}

export function compareDates(date1: Date, date2: Date, type: 'equal' | 'lessThan') {
    const dateFirst = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const dateSecond = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());

    if (type === 'equal') {
        return dateFirst === dateSecond;
    }
    else return dateFirst < dateSecond;
}