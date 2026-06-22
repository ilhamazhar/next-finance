import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-xl text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">Azhar Finance</h1>
        <p className="text-[color:var(--color-muted-foreground)]">
          QRIS payments, user management, and the Xendit webhook pipeline.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/login"><Button>Login</Button></Link>
          <Link href="/register"><Button variant="outline">Create account</Button></Link>
        </div>
      </div>
    </main>
  );
}
