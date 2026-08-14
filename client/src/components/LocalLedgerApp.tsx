import { Route, Switch } from "wouter";

import AddMenu from "@/components/AddMenu";
import ContactDetail from "@/components/ContactDetail";
import ContactForm from "@/components/ContactForm";
import ContactList from "@/components/ContactList";
import Dashboard from "@/components/Dashboard";
import ExportButton from "@/components/ExportButton";
import MakePaymentPage from "@/components/MakePaymentPage";
import ObligationForm from "@/components/ObligationForm";
import PaymentForm from "@/components/PaymentForm";

/**
 * Core ledger routes backed by scoped local IndexedDB.
 * Database selection is provided by LedgerProvider in AuthenticatedLedgerShell.
 */
export default function LocalLedgerApp() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/contacts" component={ContactList} />
      <Route path="/contacts/new" component={ContactForm} />
      <Route path="/contacts/:id" component={ContactDetail} />
      <Route path="/add" component={AddMenu} />
      <Route path="/obligations/new" component={ObligationForm} />
      <Route path="/payments/new" component={MakePaymentPage} />
      <Route path="/obligations/:id/pay" component={PaymentForm} />
      <Route path="/export" component={ExportButton} />
    </Switch>
  );
}
