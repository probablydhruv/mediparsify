import {
  isRouteErrorResponse,
  Links,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import "./app.css";
import { Toaster } from "@/components/ui/toaster";
import type { Route } from "./+types/root";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>TOMO Health Application</title>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    // <div className="min-h-screen bg-white p-4 md:p-8">
    //   <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
    //     <div className="text-center space-y-2">
    //       <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
    //         TOMO Health
    //       </h1>
    //       <p className="text-gray-600">
    //         Upload your Report file to extract text in the language of your choice.
    //       </p>
    //       <div className="gap-2">
    //         <NavLink to="/">Home</NavLink>
    //         <NavLink to="/about">About</NavLink>
    //         <NavLink to="/app">App</NavLink>
    //       </div>
    //     </div>
    //     <Toaster />
    //   </div>
    // </div>
    <Outlet />
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
