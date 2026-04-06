import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GA Multi-Property Dashboard",
  description: "Aggregated GA4 session data across multiple properties",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
