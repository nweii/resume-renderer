import type { Metadata } from "next";
import { Agentation } from "agentation";
import { siteConfig } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  applicationName: siteConfig.name,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === "development" && (
          <div className="print:hidden">
            <Agentation />
          </div>
        )}
      </body>
    </html>
  );
}
