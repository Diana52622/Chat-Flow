import { DialogSlotState } from '../models/dialogSession';

export function parseDate(message: string) {
  const lower = message.toLowerCase();
  const result: Partial<DialogSlotState> = {};
  let dateMatch = lower.match(/(\d{1,2})\s?(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)/i);
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, '0');
    const months: Record<string, string> = {
      'января': '01', 'февраля': '02', 'марта': '03', 'апреля': '04', 'мая': '05', 'июня': '06',
      'июля': '07', 'августа': '08', 'сентября': '09', 'октября': '10', 'ноября': '11', 'декабря': '12'
    };
    const month = months[dateMatch[2]];
    const year = new Date().getFullYear();
    result.date = `${day}-${month}-${year}`;
  } else {
    let dateNumMatch = lower.match(/(\d{1,2})[.\-/](\d{1,2})/);
    if (dateNumMatch) {
      const day = dateNumMatch[1].padStart(2, '0');
      const month = dateNumMatch[2].padStart(2, '0');
      const year = new Date().getFullYear();
      result.date = `${day}-${month}-${year}`;
    }
  }
  return result;
}
