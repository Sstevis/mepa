/**
 * @vitest-environment jsdom
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

import ObligationForm from "@/components/ObligationForm";
import type { Contact } from "@/types";
import { DomainValidationError } from "@/validation";

const mockAddContact = vi.fn();
const mockAddObligation = vi.fn();
const mockContactsToArray = vi.fn();

vi.mock("@/db", () => ({
  addContact: (...args: unknown[]) => mockAddContact(...args),
  addObligation: (...args: unknown[]) => mockAddObligation(...args),
}));

vi.mock("@/contexts/LedgerContext", () => ({
  useLedger: () => ({
    db: {
      contacts: {
        orderBy: () => ({
          toArray: () => mockContactsToArray(),
        }),
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

const existingContact: Contact = {
  id: "contact-existing",
  name: "Existing Contact",
  phone: "+233244123456",
  type: "supplier",
  createdAt: 1,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ObligationForm menu workflow", () => {
  beforeEach(() => {
    mockContactsToArray.mockResolvedValue([existingContact]);
    mockAddObligation.mockResolvedValue({
      id: "obl-1",
      contactId: "contact-existing",
      direction: "i_owe_them",
      amount: 500,
      description: "Carton of rice",
      date: "2026-08-01",
      dueDate: "2026-08-20",
      status: "open",
      remainingAmount: 500,
      createdAt: 1,
    });
  });

  function renderForm(path = "/obligations/new") {
    const { hook } = memoryLocation({ path });
    return render(
      <Router hook={hook}>
        <ObligationForm />
      </Router>,
    );
  }

  it("can select an existing contact and save an obligation", async () => {
    const user = userEvent.setup();
    renderForm();

    await waitFor(() => {
      expect(screen.getByLabelText("Contact")).toBeTruthy();
    });

    await user.selectOptions(screen.getByLabelText("Contact"), "contact-existing");
    await user.selectOptions(screen.getByLabelText("Direction"), "they_owe_me");
    await user.type(screen.getByLabelText("Amount (GHS)"), "500");
    await user.type(screen.getByLabelText("Description"), "Cosmetics batch");
    await user.type(screen.getByLabelText("Due Date"), "2026-08-20");
    await user.click(screen.getByRole("button", { name: "Save Obligation" }));

    await waitFor(() => {
      expect(mockAddObligation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          contactId: "contact-existing",
          direction: "they_owe_me",
          amount: 500,
          description: "Cosmetics batch",
        }),
      );
    });

    expect(screen.getByText("Obligation saved successfully.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "View contact" }).getAttribute("href")).toBe(
      "/contacts/contact-existing",
    );
  });

  it("creates a valid new contact inline and selects it before saving", async () => {
    const user = userEvent.setup();
    mockAddContact.mockResolvedValue({
      id: "contact-new",
      name: "New Supplier",
      phone: "+233244999999",
      type: "supplier",
      createdAt: 2,
    });
    mockAddObligation.mockResolvedValue({
      id: "obl-2",
      contactId: "contact-new",
      direction: "i_owe_them",
      amount: 700,
      description: "Fresh stock",
      date: "2026-08-01",
      dueDate: "2026-08-22",
      status: "open",
      remainingAmount: 700,
      createdAt: 2,
    });

    renderForm();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Create new contact" })).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: "Create new contact" }));
    await user.type(screen.getByLabelText("Name"), "New Supplier");
    await user.type(screen.getByLabelText("Phone"), "0244999999");
    await user.click(screen.getByRole("button", { name: "Save contact" }));

    await waitFor(() => {
      expect(mockAddContact).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: "New Supplier",
          phone: "0244999999",
        }),
      );
    });

    await user.type(screen.getByLabelText("Amount (GHS)"), "700");
    await user.type(screen.getByLabelText("Description"), "Fresh stock");
    await user.type(screen.getByLabelText("Due Date"), "2026-08-22");
    await user.click(screen.getByRole("button", { name: "Save Obligation" }));

    await waitFor(() => {
      expect(mockAddObligation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ contactId: "contact-new" }),
      );
    });
  });

  it("rejects invalid Ghana phone input during inline contact creation", async () => {
    const user = userEvent.setup();
    mockAddContact.mockRejectedValue(
      new DomainValidationError(
        "Enter a valid Ghana phone number (10-digit local or +233 international).",
      ),
    );

    renderForm();

    await user.click(screen.getByRole("button", { name: "Create new contact" }));
    await user.type(screen.getByLabelText("Name"), "Invalid Phone");
    fireEvent.change(screen.getByLabelText("Phone"), {
      target: { value: "024412345" },
    });
    await user.click(screen.getByRole("button", { name: "Save contact" }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Enter a valid Ghana phone number (10-digit local or +233 international).",
        ),
      ).toBeTruthy();
    });
    expect(mockAddObligation).not.toHaveBeenCalled();
  });

  it("uses the scoped ledger client from LedgerContext", async () => {
    renderForm();

    await waitFor(() => {
      expect(mockContactsToArray).toHaveBeenCalled();
    });
  });
});
