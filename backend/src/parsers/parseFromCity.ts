import { capitalize } from '../utils/capitalize';
import { fuzzyCitySearch } from './fuzzyCitySearch';
import { DialogSlotState } from '../models/dialogSession';
import { cleanCityCandidate } from './cityUtils';

export function parseFromCity(
  message: string,
  slot_state?: DialogSlotState,
  expectedSlot?: 'from_city' | 'to_city' | 'date' | 'passengers' | 'transport_type'
) {
  const lower = message.toLowerCase();
  const result: Partial<DialogSlotState & { city_candidate?: string; city_candidate_type?: string }> = {};
  let fromCityMatch = lower.match(/(?:из|откуда)\s+([а-яa-zё\- ]+)/i);
  if (fromCityMatch) {
    const candidate = capitalize(fromCityMatch[1].trim());
    const clean = cleanCityCandidate(candidate);
    if (clean) {
      const fuseResult = fuzzyCitySearch(clean);
      if (fuseResult.length > 0 && fuseResult[0].score !== undefined && fuseResult[0].score === 0) {
        result.from_city = fuseResult[0].item;
      } else if (fuseResult.length > 0 && fuseResult[0].score !== undefined && fuseResult[0].score < 0.3) {
        if (clean.toLowerCase() !== fuseResult[0].item.toLowerCase()) {
          result.city_candidate = fuseResult[0].item;
          result.city_candidate_type = 'from_city';
        } else {
          result.from_city = fuseResult[0].item;
        }
      }
    }
  } else if (expectedSlot === 'from_city' && message.trim().length > 1) {
    const rawCity = capitalize(message.trim());
    const fuseResult = fuzzyCitySearch(rawCity);
    if (fuseResult.length > 0 && fuseResult[0].score !== undefined && fuseResult[0].score === 0) {
      result.from_city = fuseResult[0].item;
    } else if (fuseResult.length > 0 && fuseResult[0].score !== undefined && fuseResult[0].score < 0.3) {
      if (rawCity.toLowerCase() !== fuseResult[0].item.toLowerCase()) {
        result.city_candidate = fuseResult[0].item;
        result.city_candidate_type = 'from_city';
      } else {
        result.from_city = fuseResult[0].item;
      }
    } else {
      result.city_candidate = rawCity;
      result.city_candidate_type = 'from_city';
    }
  }
  return result;
}
