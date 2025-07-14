import { DialogSlotState } from '../models/dialogSession';

export function parsePassengers(message: string, expectedSlot?: string) {
  const lower = message.toLowerCase();
  const result: Partial<DialogSlotState> = {};
  let passengersMatch = lower.match(/(\d+)\s?(пассажир|чел|человека|людей)/);
  if (passengersMatch) {
    result.passengers = parseInt(passengersMatch[1]);
  } else {
    if (
      expectedSlot === 'passengers' &&
      /^\d+$/.test(lower.trim())
    ) {
      result.passengers = parseInt(lower.trim());
    }
  }
  return result;
}
