import Link from "next/link";
import { Logo } from "@/components/Logo";
import { CONTACT } from "@/lib/contact";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pa">
      <header className="pa-top">
        <Link href="/" aria-label="Estudio Digital Pro, inicio">
          <Logo size={16} />
        </Link>
      </header>
      <main className="pa-main">{children}</main>
      <footer className="pa-foot">
        ¿Problemas para entrar? <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> ·{" "}
        <a href={`tel:${CONTACT.phone}`}>{CONTACT.phoneDisplay}</a>
      </footer>
    </div>
  );
}
