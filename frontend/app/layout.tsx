import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DrinkBuddies - Stay Strong Together",
  description: "A social network for recovering alcoholics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.NodeNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
