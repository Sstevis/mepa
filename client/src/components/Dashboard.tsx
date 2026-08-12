import { Link } from "wouter";
import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";

import Layout from "@/components/Layout";
import ObligationCard from "@/components/ObligationCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useContacts, useObligations } from "@/hooks/useDbData";
import {
  calculateGlobalBalance,
  isOverdue,
} from "@/utils/calculateBalances";
import { formatCurrency } from "@/utils/formatCurrency";

const listVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

export default function Dashboard() {
  const { contacts } = useContacts();
  const { obligations } = useObligations();

  const { totalTheyOweMe, totalIOweThem } = calculateGlobalBalance(obligations);

  const overdue = obligations
    .filter((o) => isOverdue(o))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const contactMap = Object.fromEntries(contacts.map((c) => [c.id, c.name]));

  return (
    <Layout title="Dashboard">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-emerald-800">
                  You are owed
                </CardTitle>
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-3xl font-bold tabular-nums text-emerald-900">
                {formatCurrency(totalTheyOweMe)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-red-800">You owe</CardTitle>
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-3xl font-bold tabular-nums text-red-900">
                {formatCurrency(totalIOweThem)}
              </p>
            </CardContent>
          </Card>
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">Overdue</h2>
            <Link href="/contacts" className="text-sm text-teal-700">
              View contacts
            </Link>
          </div>

          {overdue.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-muted-foreground shadow-sm">
              No overdue obligations. Add a contact and record credit to get
              started.
            </p>
          ) : (
            <motion.div
              className="space-y-3"
              variants={listVariants}
              initial="hidden"
              animate="show"
            >
              {overdue.map((obligation) => (
                <motion.div key={obligation.id} variants={itemVariants}>
                  <ObligationCard
                    obligation={obligation}
                    contactName={contactMap[obligation.contactId]}
                    showContact
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>
      </div>
    </Layout>
  );
}
