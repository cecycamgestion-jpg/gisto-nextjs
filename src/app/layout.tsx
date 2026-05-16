import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "THE GISTO — De una clase grabada a un curso profesional",
  description: "Transforma tus grabaciones de clase en cursos completos. Cápsulas pedagógicas, documentos, quizzes y glosario automáticos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
