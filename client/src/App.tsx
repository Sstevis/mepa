import { Route, Switch } from "wouter";

import AuthCallback from "@/components/AuthCallback";
import AuthPage from "@/components/AuthPage";
import ProtectedRoute from "@/components/ProtectedRoute";
import ReceiptViewer from "@/components/ReceiptViewer";
import WorkspacePending from "@/components/WorkspacePending";

function ProtectedWorkspaceBoundary() {
  return (
    <ProtectedRoute>
      <WorkspacePending />
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Switch>
      <Route path="/auth/callback" component={AuthCallback} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/verify" component={ReceiptViewer} />
      <Route path="/" component={ProtectedWorkspaceBoundary} />
      <Route path="/contacts" component={ProtectedWorkspaceBoundary} />
      <Route path="/contacts/new" component={ProtectedWorkspaceBoundary} />
      <Route path="/contacts/:id" component={ProtectedWorkspaceBoundary} />
      <Route path="/add" component={ProtectedWorkspaceBoundary} />
      <Route path="/obligations/new" component={ProtectedWorkspaceBoundary} />
      <Route path="/obligations/:id/pay" component={ProtectedWorkspaceBoundary} />
      <Route path="/export" component={ProtectedWorkspaceBoundary} />
    </Switch>
  );
}
