interface VerifyRecaptchaOptions {
  token?: string | unknown;
  action?: string;
  minScore?: number;
}

interface VerifyRecaptchaResult {
  success: boolean;
  score?: number;
  error?: string;
  skipped?: boolean;
}

/**
 * Valida un token de Google reCAPTCHA v3 en el servidor.
 * Si RECAPTCHA_SECRET_KEY no está configurado (ej: desarrollo local o despliegue inicial),
 * permite el envío de forma segura sin interrumpir la operativa del negocio.
 */
export async function verifyRecaptcha({
  token,
  action,
  minScore = 0.5,
}: VerifyRecaptchaOptions): Promise<VerifyRecaptchaResult> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  // Si la clave no está configurada, permitir de forma transparente (fallback seguro)
  if (!secretKey) {
    return { success: true, score: 1.0, skipped: true };
  }

  if (!token || typeof token !== "string" || !token.trim()) {
    return {
      success: false,
      error: "Verificación de seguridad no completada. Por favor, recarga e inténtalo de nuevo.",
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token.trim());

    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      console.warn("[reCAPTCHA] Respuesta HTTP no exitosa de Google siteverify:", response.status);
      return { success: false, error: "Error de comunicación con el servicio de seguridad." };
    }

    const data = await response.json();

    if (!data.success) {
      console.warn("[reCAPTCHA] Verificación rechazada por Google:", data["error-codes"]);
      return {
        success: false,
        error: "Verificación de seguridad rechazada. Por favor, inténtalo de nuevo.",
      };
    }

    // Comprobación de puntuación de confianza (0.0 a 1.0)
    const score = typeof data.score === "number" ? data.score : 1.0;
    if (score < minScore) {
      console.warn(`[reCAPTCHA] Puntuación de bot sospechosa: ${score} (mínimo ${minScore})`);
      return {
        success: false,
        score,
        error: "La verificación de seguridad ha detectado actividad inusual. Inténtalo más tarde.",
      };
    }

    // Comprobación opcional de acción coincidente
    if (action && data.action && data.action !== action) {
      console.warn(`[reCAPTCHA] Acción no coincidente: esperada "${action}", recibida "${data.action}"`);
      return {
        success: false,
        score,
        error: "Acción de seguridad no válida.",
      };
    }

    return { success: true, score };
  } catch (err) {
    console.error("[reCAPTCHA] Excepción al verificar token en Google:", err);
    // En caso de caída del servicio de Google, permitimos para no perder clientes reales
    return { success: true, score: 1.0, skipped: true };
  }
}
