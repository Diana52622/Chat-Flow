import { DialogSlotState } from '../models/dialogSession';

export function parseTransportType(message: string, expectedSlot?: string) {
  const lower = message.toLowerCase();
  const result: Partial<DialogSlotState> = {};
  if (lower.includes('поезд')) result.transport_type = 'поезд';
  else if (lower.includes('автобус')) result.transport_type = 'автобус';
  else if (lower.includes('самолет') || lower.includes('самолёт') || lower.includes('plane')) result.transport_type = 'самолет';
  else if (
    expectedSlot === 'transport_type' &&
    ['поезд', 'автобус', 'самолет', 'самолёт', 'plane'].includes(lower.trim())
  ) {
    if (lower.trim() === 'поезд') result.transport_type = 'поезд';
    if (lower.trim() === 'автобус') result.transport_type = 'автобус';
    if (['самолет', 'самолёт', 'plane'].includes(lower.trim())) result.transport_type = 'самолет';
  }
  return result;
}
