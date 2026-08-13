import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SUPABASE_CONFIG_ERROR } from "@/lib/supabaseConfig";

export default function SupabaseConfigError() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20 px-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Supabase configuration required</CardTitle>
          <CardDescription>
            Authentication is enabled for this build, but public Supabase
            settings are missing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>{SUPABASE_CONFIG_ERROR}</p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>Copy <code className="rounded bg-muted px-1">.env.example</code> to <code className="rounded bg-muted px-1">.env.local</code>.</li>
            <li>Add your Supabase Project URL and public publishable (anon) key.</li>
            <li>Restart the dev server or rebuild the app.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
