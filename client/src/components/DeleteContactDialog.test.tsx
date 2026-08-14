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
import { afterEach, describe, expect, it, vi } from "vitest";

import { DeleteContactDialog } from "@/components/DeleteContactDialog";

vi.mock("@/contexts/LedgerContext", () => ({
  useLedger: () => ({
    db: {},
    scopeKey: "test:test",
    databaseName: "test-db",
  }),
}));

vi.mock("@/db", () => ({
  getContactDeletionSummary: vi.fn().mockResolvedValue({
    obligationCount: 2,
    paymentCount: 1,
  }),
}));

afterEach(() => {
  cleanup();
});

describe("DeleteContactDialog", () => {
  it("cancels deletion without calling confirm", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <DeleteContactDialog
        open
        contactId="contact-1"
        contactName="Kwame"
        deleting={false}
        error=""
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Related obligations:/)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("shows the contact name and related record counts", async () => {
    render(
      <DeleteContactDialog
        open
        contactId="contact-1"
        contactName="Kwame"
        deleting={false}
        error=""
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeTruthy();
      expect(screen.getByText(/You are about to delete/)).toBeTruthy();
      expect(screen.getByText(/Related obligations:/)).toBeTruthy();
      expect(screen.getByText(/Related payments:/)).toBeTruthy();
    });
  });
});
