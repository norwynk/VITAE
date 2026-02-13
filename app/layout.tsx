import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Workforce Healthcare - Your Wellness Journey",
  description: "Personalized workplace wellness and healthcare management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
