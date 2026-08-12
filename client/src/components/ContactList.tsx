import { Link } from "wouter";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useContacts, useObligations } from "@/hooks/useDbData";
import { calculateContactBalance } from "@/utils/calculateBalances";
import { formatCurrency } from "@/utils/formatCurrency";
import { cn } from "@/lib/utils";

const avatarColors = [
  "bg-teal-500",
  "bg-emerald-500",
  "bg-cyan-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-rose-500",
];

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

function avatarColor(name: string): string {
  return avatarColors[name.charCodeAt(0) % avatarColors.length];
}

export default function ContactList() {
  const { contacts } = useContacts();
  const { obligations } = useObligations();

  return (
    <Layout title="Contacts">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Suppliers and customers
        </p>
        <Link href="/contacts/new">
          <Button size="sm" className="min-h-[44px] bg-teal-700 hover:bg-teal-800">
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </Link>
      </div>

      {contacts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-muted-foreground">No contacts yet.</p>
          <Link href="/contacts/new">
            <Button className="mt-4 min-h-[44px] bg-teal-700 hover:bg-teal-800">
              Add your first contact
            </Button>
          </Link>
        </div>
      ) : (
        <motion.ul
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          variants={listVariants}
          initial="hidden"
          animate="show"
        >
          {contacts.map((contact) => {
            const balance = calculateContactBalance(
              contact.id,
              obligations,
            );

            return (
              <motion.li key={contact.id} variants={itemVariants}>
                <Link href={`/contacts/${contact.id}`}>
                  <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:transition-shadow md:hover:shadow-md">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white",
                          avatarColor(contact.name),
                        )}
                      >
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-base font-bold tracking-tight">
                              {contact.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {contact.phone}
                            </p>
                          </div>
                          <Badge
                            variant={
                              contact.type === "customer" ? "success" : "danger"
                            }
                          >
                            {contact.type}
                          </Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-sm tabular-nums">
                          {balance.theyOweMe > 0 && (
                            <span className="text-emerald-700">
                              Owes you {formatCurrency(balance.theyOweMe)}
                            </span>
                          )}
                          {balance.iOweThem > 0 && (
                            <span className="text-red-700">
                              You owe {formatCurrency(balance.iOweThem)}
                            </span>
                          )}
                          {balance.theyOweMe === 0 && balance.iOweThem === 0 && (
                            <span className="text-muted-foreground">Settled</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.li>
            );
          })}
        </motion.ul>
      )}
    </Layout>
  );
}
