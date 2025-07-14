import { DialogSlotState, SlotName } from '../models/dialogSession';

const slotQuestions: Record<SlotName, string> = {
  from_city: 'Из какого города вы выезжаете?',
  to_city: 'В какой город вы хотите поехать?',
  date: 'На какую дату планируете поездку?',
  passengers: 'Сколько пассажиров?',
  transport_type: 'Какой способ передвижения предпочитаете (поезд, автобус, самолет)?',
};

const slotOrder: SlotName[] = [
  'from_city',
  'to_city',
  'date',
  'passengers',
  'transport_type',
];

export function getMissingSlot(state: DialogSlotState): SlotName | null {
  for (const slot of slotOrder) {
    if (state[slot] === undefined || state[slot] === null || state[slot] === '') {
      return slot;
    }
  }
  return null;
}

export function getSlotQuestion(slot: SlotName): string {
  return slotQuestions[slot];
}

export function isAllSlotsFilled(state: DialogSlotState): boolean {
  return slotOrder.every((slot) => state[slot] !== undefined && state[slot] !== null && state[slot] !== '');
}

export function buildConfirmation(state: DialogSlotState): string {
  return `Подтверждаю: ${state.from_city} → ${state.to_city}, дата: ${state.date}, пассажиров: ${state.passengers}, транспорт: ${state.transport_type}. Все верно?`;
}
