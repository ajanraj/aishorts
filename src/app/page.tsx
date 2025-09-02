import { CitrusIcon } from "lucide-react";
import { signIn, auth } from "@/auth";
import { GoogleIcon } from "@/components/icons/google";
import { LemonSqueezyIcon } from "@/components/icons/lemonsqueezy";
import { SubmitButton } from "@/components/submit-button";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }
  return (
    <div className="grid min-h-lvh auto-rows-[1fr_auto] grid-cols-1 items-center justify-center gap-10 lg:auto-rows-auto lg:grid-cols-2">
      <main className="container w-full max-w-xl space-y-8 py-24 text-center lg:text-start">
        <div className="border-surface-100 shadow-wg-xs inline-flex size-20 items-center justify-center rounded-3xl border text-primary backdrop-blur-sm">
          <img src="logo.svg" alt="CursorShorts.com" className="h-10" />
        </div>

        <h1 className="text-surface-900 text-balance text-3xl lg:text-4xl">
          Sign in to Cursorshorts.com
        </h1>

        <form
          className="pt-2"
          action={async () => {
            "use server";
            await signIn("google");
          }}
        >
          <SubmitButton
            before={<GoogleIcon />}
            className="rounded-full py-2.5 text-base"
          >
            Sign in with Google
          </SubmitButton>
        </form>
      </main>
    </div>
  );
}
