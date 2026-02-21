/**
 * Utilidades para procesar mensajes de alerta
 */

/**
 * Procesa el mensaje de alerta y reemplaza trustId hardcodeado con el trustId correcto
 * @param alert - La alerta a procesar
 * @param selectedTrustId - El trustId seleccionado actualmente (opcional)
 * @returns El mensaje procesado con el trustId correcto
 */
export function processAlertMessage(alert: any, selectedTrustId?: string): string {
  let message = alert.message;
  
  // Si la alerta tiene un activo asociado, usar su trustId
  // Si no, usar el trustId seleccionado actualmente
  const trustIdToUse = alert.asset?.trustId || selectedTrustId;
  
  if (trustIdToUse) {
    // Reemplazar cualquier trustId hardcodeado en el mensaje con el trustId correcto
    // Buscar patrones como "fideicomiso 10045" o "fideicomiso 10045." y reemplazarlos
    message = message.replace(/fideicomiso\s+\d{4}-\d{4}/gi, `fideicomiso ${trustIdToUse}`);
    message = message.replace(/fideicomiso\s+\d{4,}/gi, `fideicomiso ${trustIdToUse}`);
  }
  
  return message;
}
