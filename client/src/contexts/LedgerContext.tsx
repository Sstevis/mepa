import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getScopedLedgerDatabase,
  releaseScopedLedgerDatabase,
  type MepaDatabase,
} from "@/db";
import {
  buildLedgerScopeKey,
  buildScopedLedgerDatabaseName,
} from "@/lib/ledgerScope";

interface LedgerContextValue {
  db: MepaDatabase;
  scopeKey: string;
  databaseName: string;
}

const LedgerContext = createContext<LedgerContextValue | null>(null);

interface LedgerProviderProps {
  userId: string;
  workspaceId: string;
  scopeRevision: number;
  children: ReactNode;
}

export function LedgerProvider({
  userId,
  workspaceId,
  scopeRevision,
  children,
}: LedgerProviderProps) {
  const scopeKey = useMemo(
    () => buildLedgerScopeKey(userId, workspaceId),
    [userId, workspaceId],
  );
  const databaseName = useMemo(
    () => buildScopedLedgerDatabaseName(userId, workspaceId),
    [userId, workspaceId],
  );
  const [db, setDb] = useState<MepaDatabase>(() =>
    getScopedLedgerDatabase(userId, workspaceId),
  );

  useEffect(() => {
    const nextDb = getScopedLedgerDatabase(userId, workspaceId);
    setDb(nextDb);

    return () => {
      void releaseScopedLedgerDatabase(userId, workspaceId);
    };
  }, [userId, workspaceId, scopeRevision, scopeKey]);

  const value = useMemo(
    () => ({
      db,
      scopeKey,
      databaseName,
    }),
    [db, scopeKey, databaseName],
  );

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
}

export function useLedger(): LedgerContextValue {
  const context = useContext(LedgerContext);

  if (!context) {
    throw new Error("useLedger must be used within a LedgerProvider.");
  }

  return context;
}
