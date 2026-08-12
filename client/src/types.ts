export type ContactType = "supplier" | "customer";

export interface Contact {
  id: string;
  name: string;
  phone: string;
  type: ContactType;
  createdAt: number;
}

export type ObligationDirection = "they_owe_me" | "i_owe_them";
export type ObligationStatus = "open" | "partial" | "settled";

export interface Obligation {
  id: string;
  contactId: string;
  direction: ObligationDirection;
  amount: number;
  description: string;
  date: string;
  dueDate: string;
  status: ObligationStatus;
  remainingAmount: number;
  createdAt: number;
}

export type PaymentMethod = "cash" | "momo";

export interface Payment {
  id: string;
  obligationId: string;
  amount: number;
  method: PaymentMethod;
  reference: string;
  date: string;
  note: string;
  createdAt: number;
}

export interface ContactBalance {
  contactId: string;
  theyOweMe: number;
  iOweThem: number;
}

export interface GlobalBalance {
  totalTheyOweMe: number;
  totalIOweThem: number;
}

export interface ReceiptPayload {
  obligation: Obligation;
  payments: Payment[];
  contact: Contact;
}
