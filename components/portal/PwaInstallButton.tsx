"use client";

import { useEffect, useState } from "react";

// Singleton en memoria para capturar el evento `beforeinstallprompt` tan pronto ocurra
let globalInstallPrompt: any = null;
const promptListeners = new Set<(prompt: any) => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e: any) => {
    e.preventDefault();
    globalInstallPrompt = e;
    promptListeners.forEach((listener) => listener(e));
  });

  window.addEventListener("appinstalled", () => {
    globalInstallPrompt = null;
    promptListeners.forEach((listener) => listener(null));
  });
}

function checkIsStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const isStandaloneMedia = window.matchMedia("(display-mode: standalone)").matches;
  const isIosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  const isAndroidReferrer = typeof document !== "undefined" && document.referrer.includes("android-app://");
  return Boolean(isStandaloneMedia || isIosStandalone || isAndroidReferrer);
}

function detectIsIos(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return (
    /iphone|ipad|ipod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

interface PwaInstallButtonProps {
  variant?: "login" | "topbar" | "banner";
  className?: string;
}

export function PwaInstallButton({ variant = "login", className = "" }: PwaInstallButtonProps) {
  const [isInstalled, setIsInstalled] = useState(false);
  const [hasPrompt, setHasPrompt] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // 1. Detectar si ya está en modo instalado
    if (checkIsStandalone()) {
      setIsInstalled(true);
      return;
    }

    // 2. Detectar si es dispositivo iOS (Safari)
    setIsIos(detectIsIos());

    // 3. Sincronizar con el evento capturado
    if (globalInstallPrompt) {
      setHasPrompt(true);
    }

    const listener = (prompt: any) => {
      setHasPrompt(Boolean(prompt));
      if (!prompt && checkIsStandalone()) {
        setIsInstalled(true);
      }
    };

    promptListeners.add(listener);
    return () => {
      promptListeners.delete(listener);
    };
  }, []);

  // Si la aplicación ya está instalada o ejecutándose en standalone, no mostramos nada
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (globalInstallPrompt) {
      try {
        await globalInstallPrompt.prompt();
        const choice = await globalInstallPrompt.userChoice;
        if (choice && choice.outcome === "accepted") {
          setIsInstalled(true);
          globalInstallPrompt = null;
          setHasPrompt(false);
        }
      } catch (err) {
        console.warn("[PWA] Error activando prompt nativo:", err);
        setShowModal(true);
      }
    } else {
      // En iOS o navegadores donde el prompt nativo no está disponible, abrimos la guía visual
      setShowModal(true);
    }
  };

  return (
    <>
      {/* ── Variante LOGIN ── */}
      {variant === "login" && (
        <div className={`pwa-login-install-card ${className}`.trim()}>
          <div className="pwa-login-install-header">
            <div className="pwa-login-install-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="0" />
                <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" />
                <path d="M12 6v6m0 0l-2-2m2 2l2-2" />
              </svg>
            </div>
            <div className="pwa-login-install-text">
              <span className="pwa-login-install-title">Instalar App en tu pantalla</span>
              <span className="pwa-login-install-sub">
                Acceso directo sin navegador, más rápido y con notificaciones.
              </span>
            </div>
          </div>
          <button
            type="button"
            className="pwa-login-install-btn"
            onClick={handleInstallClick}
            aria-label="Instalar la aplicación PWA en tu dispositivo"
          >
            {hasPrompt ? "Instalar App" : isIos ? "Cómo Instalar en iPhone" : "Instalar App"}
          </button>
        </div>
      )}

      {/* ── Variante TOPBAR (Cabecera del Área de Clientes) ── */}
      {variant === "topbar" && (
        <button
          type="button"
          className={`pwa-topbar-install-btn ${className}`.trim()}
          onClick={handleInstallClick}
          title="Instalar App en tu dispositivo"
          aria-label="Instalar App en tu pantalla de inicio"
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span className="pwa-topbar-install-label">Instalar App</span>
        </button>
      )}

      {/* ── Variante BANNER COMPACTO ── */}
      {variant === "banner" && (
        <div className={`pwa-banner-install ${className}`.trim()}>
          <div className="pwa-banner-install-info">
            <strong>Instala el Portal EDP</strong>
            <span>Disponible para móvil y ordenador.</span>
          </div>
          <button
            type="button"
            className="pwa-banner-install-btn"
            onClick={handleInstallClick}
          >
            Instalar
          </button>
        </div>
      )}

      {/* ── MODAL GUÍA DE INSTALACIÓN RÁPIDA (Brutalista) ── */}
      {showModal && (
        <div className="pwa-install-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="pwa-modal-title">
          <div className="pwa-install-modal-card">
            <div className="pwa-install-modal-head">
              <div className="pwa-install-modal-title-wrap">
                <span className="pwa-install-modal-badge">APP PWA</span>
                <h3 id="pwa-modal-title" className="pwa-install-modal-title">
                  {isIos ? "Instalar en tu iPhone o iPad" : "Instalar en tu dispositivo"}
                </h3>
              </div>
              <button
                type="button"
                className="pwa-install-modal-close"
                onClick={() => setShowModal(false)}
                aria-label="Cerrar ventana de instalación"
              >
                ✕
              </button>
            </div>

            <div className="pwa-install-modal-body">
              {isIos ? (
                <div className="pwa-install-steps">
                  <p className="pwa-install-intro">
                    En Safari de iOS la instalación se activa en solo <strong>2 toques</strong>:
                  </p>
                  <ol className="pwa-steps-list">
                    <li>
                      <div className="pwa-step-num">1</div>
                      <div className="pwa-step-desc">
                        Toca el botón <strong>Compartir</strong> en la barra inferior de Safari.
                        <div className="pwa-step-icon-badge">
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                            <polyline points="16 6 12 2 8 6" />
                            <line x1="12" y1="2" x2="12" y2="15" />
                          </svg>
                          <span>Icono de compartir (cuadrado con flecha)</span>
                        </div>
                      </div>
                    </li>
                    <li>
                      <div className="pwa-step-num">2</div>
                      <div className="pwa-step-desc">
                        Baja en el menú y selecciona <strong>«Añadir a pantalla de inicio»</strong>.
                        <div className="pwa-step-icon-badge">
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="0" />
                            <line x1="12" y1="8" x2="12" y2="16" />
                            <line x1="8" y1="12" x2="16" y2="12" />
                          </svg>
                          <span>«Añadir a pantalla de inicio»</span>
                        </div>
                      </div>
                    </li>
                    <li>
                      <div className="pwa-step-num">3</div>
                      <div className="pwa-step-desc">
                        Pulsa <strong>«Añadir»</strong> arriba a la derecha. ¡Listo! Se abrirá como app nativa a pantalla completa.
                      </div>
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="pwa-install-steps">
                  <p className="pwa-install-intro">
                    Para instalar la app en <strong>Chrome, Edge o Android</strong>:
                  </p>
                  <ol className="pwa-steps-list">
                    <li>
                      <div className="pwa-step-num">1</div>
                      <div className="pwa-step-desc">
                        Abre el menú de opciones del navegador (los <strong>tres puntos ⋮</strong> arriba a la derecha).
                      </div>
                    </li>
                    <li>
                      <div className="pwa-step-num">2</div>
                      <div className="pwa-step-desc">
                        Selecciona <strong>«Instalar aplicación»</strong> o <strong>«Añadir a la pantalla principal»</strong>.
                      </div>
                    </li>
                    <li>
                      <div className="pwa-step-num">3</div>
                      <div className="pwa-step-desc">
                        Confirma pulsando <strong>«Instalar»</strong>. Tendrás un icono directo sin barras de navegador.
                      </div>
                    </li>
                  </ol>
                </div>
              )}
            </div>

            <div className="pwa-install-modal-foot">
              <button
                type="button"
                className="pwa-install-modal-ok-btn"
                onClick={() => setShowModal(false)}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
