import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./styles/globals.css";
import "./i18n/config";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element with id 'root' not found");
}

const root = createRoot(rootElement);
const queryClient = new QueryClient();

function renderApp() {
  root.render(
    <StrictMode>
      <ClerkProvider publishableKey={clerkPubKey!}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ClerkProvider>
    </StrictMode>,
  );
}

function renderClerkConfigError(message: string, hints: string[]) {
  root.render(
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
      <div className="max-w-xl rounded-3xl border border-neutral-200 bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-neutral-900">Clerk configuration required</h1>
        <p className="mt-3 text-neutral-600">{message}</p>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-neutral-600">
          {hints.map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-neutral-500">
          Update the <code>.env</code> file (see <code>.env.example</code>) and restart the dev server once the key is
          in place.
        </p>
      </div>
    </div>,
  );
}

if (!clerkPubKey) {
  renderClerkConfigError("A Clerk publishable key is required for authentication features.", [
    "Set VITE_CLERK_PUBLISHABLE_KEY in your .env file.",
    "Use a key that starts with pk_test_… or pk_live_… from your Clerk dashboard.",
  ]);
} else if (!/^pk_(test|live)_[a-zA-Z0-9]+$/.test(clerkPubKey.trim())) {
  renderClerkConfigError("The configured Clerk publishable key is invalid.", [
    "Confirm the value in VITE_CLERK_PUBLISHABLE_KEY matches the format pk_test_xxx or pk_live_xxx.",
    "Copy a fresh publishable key from the Clerk dashboard if needed.",
  ]);
} else {
  renderApp();
}
