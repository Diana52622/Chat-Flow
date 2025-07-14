import { capitalize } from '../utils/capitalize';
import { fuzzyCitySearch } from './fuzzyCitySearch';
import { DialogSlotState } from '../models/dialogSession';
import { cleanCityCandidate } from './cityUtils';

export function parseToCity(
  message: string,
  slot_state?: DialogSlotState,
  expectedSlot?: 'from_city' | 'to_city' | 'date' | 'passengers' | 'transport_type'
) {
  const lower = message.toLowerCase();
  const result: Partial<DialogSlotState & { city_candidate?: string; city_candidate_type?: string }> = {};
  let toCityMatch = lower.match(/(?:в|куда|поехать в)\s+([а-яa-zё\- ]+)/i);
  let rawCity = '';
  if (toCityMatch) {
    const candidate = capitalize(toCityMatch[1].trim());
    const clean = cleanCityCandidate(candidate);
    if (clean) {
      const fuseResult = fuzzyCitySearch(clean);
      if (fuseResult.length > 0 && fuseResult[0].score !== undefined && fuseResult[0].score === 0) {
        result.to_city = fuseResult[0].item;
      } else if (fuseResult.length > 0 && fuseResult[0].score !== undefined && fuseResult[0].score < 0.3) {
        if (clean.toLowerCase() !== fuseResult[0].item.toLowerCase()) {
          result.city_candidate = fuseResult[0].item;
          result.city_candidate_type = 'to_city';
        } else {
          result.to_city = fuseResult[0].item;
        }
      }
    }
  } else if (expectedSlot === 'to_city' && message.trim().split(' ').length === 1) {
    rawCity = capitalize(message.trim());
  } else if (expectedSlot === 'to_city') {
    const words = message.trim().split(' ');
    if (words.length > 1) {
      rawCity = capitalize(words[words.length - 1]);
    }
  }
  if (rawCity && !rawCity.includes(' ')) {
    const fuseResult = fuzzyCitySearch(rawCity);
    if (fuseResult.length > 0 && fuseResult[0].score !== undefined && fuseResult[0].score === 0) {
      result.to_city = fuseResult[0].item;
    } else if (fuseResult.length > 0 && fuseResult[0].score !== undefined && fuseResult[0].score < 0.3) {
      if (rawCity.toLowerCase() !== fuseResult[0].item.toLowerCase()) {
        result.city_candidate = fuseResult[0].item;
        result.city_candidate_type = 'to_city';
      } else {
        result.to_city = fuseResult[0].item;
      }
    }
  }
  return result;
}
