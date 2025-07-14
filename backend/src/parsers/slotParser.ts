import { DialogSlotState } from '../models/dialogSession';
import { parseFromCity } from './parseFromCity';
import { parseToCity } from './parseToCity';
import { parseDate } from './parseDate';
import { parsePassengers } from './parsePassengers';
import { parseTransportType } from './parseTransportType';

export function parseSlotsFromMessage(
  message: string,
  expectedSlot?: 'from_city' | 'to_city' | 'date' | 'passengers' | 'transport_type',
  slot_state?: DialogSlotState
): Partial<DialogSlotState & { city_candidate?: string }> {
  let slots: Partial<DialogSlotState & { city_candidate?: string; city_candidate_type?: string }> = {};

  const fromCity = parseFromCity(message, slot_state, expectedSlot);
  slots = { ...slots, ...fromCity };
  if (!slots.from_city && !slots.city_candidate && expectedSlot === 'from_city' && message.trim().length > 1) {
    const cityCandidate = parseFromCity(message, slot_state);
    slots = { ...slots, ...cityCandidate };
  }

  const toCity = parseToCity(message, slot_state, expectedSlot);
  slots = { ...slots, ...toCity };
  if (!slots.to_city && !slots.city_candidate && expectedSlot === 'to_city' && message.trim().length > 1) {
    const cityCandidate = parseToCity(message, slot_state);
    slots = { ...slots, ...cityCandidate };
  }

  const date = parseDate(message);
  slots = { ...slots, ...date };

  const passengers = parsePassengers(message, expectedSlot);
  slots = { ...slots, ...passengers };

  const transport = parseTransportType(message, expectedSlot);
  slots = { ...slots, ...transport };

  return slots;
}
