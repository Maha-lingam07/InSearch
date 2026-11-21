import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InSearch — Creator research",
  description: "A workspace for researching and reviewing creator partnerships.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
