import type { Metadata } from "next";
import { Agentation } from "agentation";
import { funnelSans, nimbusExt } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nathan Cheng — Resume",
  description: "Resume of Nathan Cheng.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${funnelSans.variable} ${nimbusExt.variable}`}>
      <body className="font-sans antialiased">
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
