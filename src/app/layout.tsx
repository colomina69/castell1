import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Filà Moros del Castell - Benilloba",
  description: "Plataforma de gestión de la Filà Moros del Castell de Benilloba",
  icons: {
    icon: "/escudo.jpg",
  },
};

import { AuthProvider } from "@/components/AuthProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
