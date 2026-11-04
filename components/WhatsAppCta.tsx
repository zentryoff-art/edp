"use client";

import { CONTACT } from "@/lib/contact";
import { trackEvent } from "@/lib/tracking-client";

interface WhatsAppCtaProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  label?: string;
  variant?: "primary" | "secondary" | "badge" | "sticky";
  source?: string;
}

export function WhatsAppCta({
  className = "",
  style,
  children,
  label = "Preguntar por WhatsApp",
  variant = "secondary",
  source = "web/llamada",
}: WhatsAppCtaProps) {
  const phone = CONTACT.phone.replace(/\D/g, "");
  const defaultText = encodeURIComponent(
    "Hola, vengo de la web de Estudio Digital Pro y me gustaría consultar sobre la captación de clientes para mi empresa."
  );
  const href = `https://wa.me/${phone}?text=${defaultText}`;

  const handleClick = () => {
    trackEvent("Contact_WhatsApp", {
      content_name: "Contacto directo WhatsApp",
      source,
    });
  };

  if (variant === "badge") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={`wa-badge ${className}`}
        style={style}
        aria-label="Escríbenos por WhatsApp"
      >
        <span className="wa-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.27-2.42 5.83a8.18 8.18 0 0 1-5.82 2.41c-1.45 0-2.88-.38-4.14-1.11l-.3-.18-3.08.81.82-3-.19-.31a8.21 8.21 0 0 1-1.26-4.45c0-4.54 3.7-8.24 8.25-8.24zm4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.29z"/>
          </svg>
        </span>
        <span>{children || label}</span>
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={`btn btn-whatsapp ${className}`}
      style={style}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
        <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.27-2.42 5.83a8.18 8.18 0 0 1-5.82 2.41c-1.45 0-2.88-.38-4.14-1.11l-.3-.18-3.08.81.82-3-.19-.31a8.21 8.21 0 0 1-1.26-4.45c0-4.54 3.7-8.24 8.25-8.24zm4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.29z"/>
      </svg>
      <span>{children || label}</span>
    </a>
  );
}

