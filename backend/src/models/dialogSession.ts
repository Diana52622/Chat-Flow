export type SlotName = 'from_city' | 'to_city' | 'date' | 'passengers' | 'transport_type';

export interface DialogSlotState {
  from_city?: string;
  to_city?: string;
  date?: string;
  passengers?: number;
  transport_type?: string;
  correction_mode?: boolean;
  confirming_city?: { slot: 'from_city' | 'to_city', value: string };
  confirmation_stage?: boolean;
}

export interface DialogSession {
  id: number;
  slot_state: DialogSlotState;
  is_active: boolean;
  updated_at: string;
}
