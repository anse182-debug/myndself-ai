// frontend/src/utils/toast.ts

type ToastType = "success" | "error" | "info"

export function showToast(message: string, type: ToastType = "info") {
  // Versione minimale: log in console
  const prefix =
    type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️"

  console.log(`${prefix} ${message}`)

  // Se siamo in browser, per ora usiamo solo alert per errori importanti
  if (typeof window !== "undefined") {
    if (type === "error") {
      // per ora solo gli errori mostrano un alert
      // (così vedi se succede qualcosa di grave durante i test)
      // puoi sostituirlo con una UI di toast come preferisci
      // eslint-disable-next-line no-alert
      alert(message)
    }
  }
}
