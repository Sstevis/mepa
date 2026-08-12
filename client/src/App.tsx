import { useEffect } from "react";
import { Route, Switch } from "wouter";

import AddMenu from "@/components/AddMenu";
import ContactDetail from "@/components/ContactDetail";
import ContactForm from "@/components/ContactForm";
import ContactList from "@/components/ContactList";
import Dashboard from "@/components/Dashboard";
import ExportButton from "@/components/ExportButton";
import ObligationForm from "@/components/ObligationForm";
import PaymentForm from "@/components/PaymentForm";
import ReceiptViewer from "@/components/ReceiptViewer";
import { db } from "@/db";
import { seedDatabase } from "@/seed";

export default function App() {
  useEffect(() => {
    void (async () => {
      const count = await db.contacts.count();
      if (count === 0) {
        await seedDatabase();
      }
    })();
  }, []);

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/contacts" component={ContactList} />
      <Route path="/contacts/new" component={ContactForm} />
      <Route path="/contacts/:id" component={ContactDetail} />
      <Route path="/add" component={AddMenu} />
      <Route path="/obligations/new" component={ObligationForm} />
      <Route path="/obligations/:id/pay" component={PaymentForm} />
      <Route path="/export" component={ExportButton} />
      <Route path="/verify" component={ReceiptViewer} />
    </Switch>
  );
}
