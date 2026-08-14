/**
 * @vitest-environment jsdom
 */
import {
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

import MakePaymentPage from "@/components/MakePaymentPage";
import type { Contact, Obligation } from "@/types";

const mockRecordPayment = vi.fn();
const mockRefreshObligations = vi.fn();
const mockObligationGet = vi.fn();

const contactA: Contact = {
  id: "contact-a",
  name: "Kwame",
  phone: "+233244123456",
  type: "supplier",
  createdAt: 1,
};

const contactB: Contact = {
  id: "contact-b",
  name: "Ama",
  phone: "+233551237890",
  type: "customer",
  createdAt: 1,
};

const settledObligation: Obligation = {
  id: "obl-settled",
  contactId: contactB.id,
  direction: "they_owe_me",
  amount: 800,
  description: "Settled sale",
  date: "2026-08-01",
  dueDate: "2026-08-20",
  status: "settled",
  remainingAmount: 0,
  createdAt: 1,
};

const openObligation: Obligation = {
  id: "obl-open",
  contactId: contactA.id,
  direction: "i_owe_them",
  amount: 1200,
  description: "Carton of rice",
  date: "2026-08-01",
  dueDate: "2026-08-24",
  status: "open",
  remainingAmount: 1200,
  createdAt: 1,
};

const partialObligation: Obligation = {
  id: "obl-partial",
  contactId: contactA.id,
  direction: "they_owe_me",
  amount: 900,
  description: "Cosmetics batch",
  date: "2026-08-01",
  dueDate: "2026-08-22",
  status: "partial",
  remainingAmount: 400,
  createdAt: 1,
};

let contacts: Contact[] = [];
let obligations: Obligation[] = [];

vi.mock("@/hooks/useDbData", () => ({
  useContacts: () => ({
    contacts,
    loading: false,
    refresh: vi.fn(),
  }),
  useObligations: () => ({
    obligations,
    loading: false,
    refresh: mockRefreshObligations,
  }),
}));

vi.mock("@/db", () => ({
  recordPayment: (...args: unknown[]) => mockRecordPayment(...args),
}));

vi.mock("@/contexts/LedgerContext", () => ({
  useLedger: () => ({
    db: {
      obligations: {
        get: (...args: unknown[]) => mockObligationGet(...args),
      },
    },
    scopeKey: "user-1:ws-1",
    databaseName: "MepaLedger__user_user-1__workspace_ws-1",
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    signOut: vi.fn(),
  }),
}));

vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspaceOptional: () => ({
    selectedMembership: null,
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("MakePaymentPage menu workflow", () => {
  beforeEach(() => {
    contacts = [contactA, contactB];
    obligations = [openObligation, partialObligation, settledObligation];
    mockRecordPayment.mockResolvedValue({ id: "pay-1" });
  });

  function renderPage() {
    const { hook } = memoryLocation({ path: "/payments/new" });
    return render(
      <Router hook={hook}>
        <MakePaymentPage />
      </Router>,
    );
  }

  it("shows an empty state when no contacts have outstanding obligations", () => {
    contacts = [contactB];
    obligations = [settledObligation];

    renderPage();

    expect(screen.getByText("No outstanding payments")).toBeTruthy();
    expect(screen.queryByText("Kwame")).toBeNull();
  });

  it("excludes contacts whose obligations are all settled", () => {
    renderPage();

    expect(screen.getByText("Kwame")).toBeTruthy();
    expect(screen.queryByText("Ama")).toBeNull();
  });

  it("requires selecting a specific obligation when a contact has multiple outstanding items", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /Kwame/i }));

    expect(
      screen.getByText(/multiple outstanding obligations/i),
    ).toBeTruthy();
    expect(screen.getByText("Carton of rice")).toBeTruthy();
    expect(screen.getByText("Cosmetics batch")).toBeTruthy();
    expect(screen.queryByLabelText("Amount (GHS)")).toBeNull();
  });

  it("shows obligation details and records a partial payment against the selected obligation", async () => {
    const user = userEvent.setup();
    mockObligationGet.mockResolvedValue({
      ...openObligation,
      remainingAmount: 700,
      status: "partial",
    });

    renderPage();
    await user.click(screen.getByRole("button", { name: /Kwame/i }));
    await user.click(screen.getByRole("button", { name: /Carton of rice/i }));

    expect(screen.getByText(/Original amount/i)).toBeTruthy();
    expect(screen.getByText(/Remaining:/i)).toBeTruthy();

    await user.type(screen.getByLabelText("Amount (GHS)"), "500");
    await user.click(screen.getByRole("button", { name: "Save Payment" }));

    await waitFor(() => {
      expect(mockRecordPayment).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          obligationId: "obl-open",
          amount: 500,
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Payment recorded successfully.")).toBeTruthy();
      expect(screen.getByText(/Remaining balance:/i)).toBeTruthy();
      expect(screen.getByText(/Status: partial/i)).toBeTruthy();
    });
    expect(mockRefreshObligations).toHaveBeenCalled();
  });

  it("rejects overpayment before submission", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /Kwame/i }));
    await user.click(screen.getByRole("button", { name: /Carton of rice/i }));
    await user.type(screen.getByLabelText("Amount (GHS)"), "5000");
    await user.click(screen.getByRole("button", { name: "Save Payment" }));

    expect(
      screen.getByText(/Payment cannot exceed remaining/i),
    ).toBeTruthy();
    expect(mockRecordPayment).not.toHaveBeenCalled();
  });

  it("uses the scoped ledger client from LedgerContext", async () => {
    const user = userEvent.setup();
    mockObligationGet.mockResolvedValue({
      ...partialObligation,
      remainingAmount: 0,
      status: "settled",
    });

    renderPage();
    await user.click(screen.getByRole("button", { name: /Kwame/i }));
    await user.click(screen.getByRole("button", { name: /Cosmetics batch/i }));
    await user.type(screen.getByLabelText("Amount (GHS)"), "400");
    await user.click(screen.getByRole("button", { name: "Save Payment" }));

    await waitFor(() => {
      expect(mockRecordPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          obligations: expect.anything(),
        }),
        expect.objectContaining({ obligationId: "obl-partial", amount: 400 }),
      );
    });
  });
});
