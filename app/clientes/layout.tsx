import type { Metadata } from "next";
import "./portal.css";

export const metadata: Metadata = {
  title: { default: "Área de clientes", template: "%s · Área de clientes · Estudio Digital Pro" },
  robots: { index: false, follow: false },
};

export default function ClientesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
