import { Link } from "wouter";
import { UserPlus, FileText } from "lucide-react";

import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";

export default function AddMenu() {
  return (
    <Layout title="Add">
      <div className="space-y-3">
        <Link href="/contacts/new">
          <Button
            variant="outline"
            className="min-h-[56px] w-full justify-start text-base"
          >
            <UserPlus className="mr-3 h-5 w-5" />
            Add Contact
          </Button>
        </Link>
        <Link href="/obligations/new">
          <Button
            variant="outline"
            className="min-h-[56px] w-full justify-start text-base"
          >
            <FileText className="mr-3 h-5 w-5" />
            Create Obligation
          </Button>
        </Link>
      </div>
    </Layout>
  );
}
