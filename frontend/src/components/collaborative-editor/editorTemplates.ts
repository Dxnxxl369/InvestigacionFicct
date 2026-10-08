export type CoverPageTemplate = "academica" | "informe" | "sobria";
export type QuickBlockTemplate = "acta" | "resumen" | "informe";
export type TextCaseMode = "upper" | "lower" | "title" | "sentence";

export function transformTextCase(value: string, mode: TextCaseMode) {
  if (mode === "upper") return value.toLocaleUpperCase("es-BO");
  if (mode === "lower") return value.toLocaleLowerCase("es-BO");
  if (mode === "sentence") {
    const lower = value.toLocaleLowerCase("es-BO");
    return lower.replace(/(^\s*[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]|[.!?]\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/g, (match) => match.toLocaleUpperCase("es-BO"));
  }
  return value
    .toLocaleLowerCase("es-BO")
    .replace(/(^|\s|[-/])([A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/g, (match, separator: string, letter: string) => `${separator}${letter.toLocaleUpperCase("es-BO")}`);
}

export function buildCoverPageHtml(template: CoverPageTemplate, documentTitle: string, authorName?: string) {
  const title = escapeHtml(documentTitle || "Documento colaborativo");
  const author = escapeHtml(authorName || "Autor");
  const date = new Date().toLocaleDateString("es-BO");
  if (template === "informe") {
    return `
      <div class="ficct-cover-page ficct-cover-report" data-cover-page="informe">
        <p class="ficct-cover-kicker">Investigacion FICCT</p>
        <h1>${title}</h1>
        <h2>Informe de avance</h2>
        <p class="ficct-cover-meta">Autor: ${author}</p>
        <p class="ficct-cover-meta">Fecha: ${date}</p>
        <p class="ficct-cover-note">Resumen ejecutivo, objetivos, metodologia y resultados principales.</p>
      </div>
    `;
  }
  if (template === "sobria") {
    return `
      <div class="ficct-cover-page ficct-cover-clean" data-cover-page="sobria">
        <h1>${title}</h1>
        <p class="ficct-cover-rule"></p>
        <h2>Documento colaborativo</h2>
        <p class="ficct-cover-meta">${author}</p>
        <p class="ficct-cover-meta">${date}</p>
      </div>
    `;
  }
  return `
    <div class="ficct-cover-page ficct-cover-academic" data-cover-page="academica">
      <p class="ficct-cover-kicker">Universidad Autonoma Gabriel Rene Moreno</p>
      <p class="ficct-cover-kicker">Facultad Integral del Chaco - FICCT</p>
      <h1>${title}</h1>
      <h2>Documento colaborativo</h2>
      <p class="ficct-cover-meta">Integrante: ${author}</p>
      <p class="ficct-cover-meta">Docente: ______________________________</p>
      <p class="ficct-cover-meta">Asignatura: ___________________________</p>
      <p class="ficct-cover-meta">Fecha: ${date}</p>
    </div>
  `;
}

export function buildQuickBlockHtml(template: QuickBlockTemplate) {
  if (template === "acta") {
    return `
      <h1>Acta de reunion</h1>
      <p><strong>Fecha:</strong> <span data-type="word-field" data-field-code="DATE" data-field-label="Fecha">Fecha</span></p>
      <p><strong>Participantes:</strong> ______________________________</p>
      <h2>Agenda</h2>
      <ol><li>Punto principal</li><li>Revision de avances</li><li>Acuerdos</li></ol>
      <h2>Acuerdos</h2>
      <table><tbody><tr><th>Acuerdo</th><th>Responsable</th><th>Fecha limite</th></tr><tr><td></td><td></td><td></td></tr></tbody></table>
    `;
  }
  if (template === "resumen") {
    return `
      <h1>Resumen ejecutivo</h1>
      <p>Este documento resume el problema, la propuesta, los resultados principales y las recomendaciones.</p>
      <h2>Objetivo</h2>
      <p>Describir de forma breve el objetivo central del trabajo.</p>
      <h2>Resultados clave</h2>
      <ul><li>Resultado principal</li><li>Evidencia relevante</li><li>Impacto esperado</li></ul>
      <h2>Recomendaciones</h2>
      <p>Acciones sugeridas para la siguiente etapa.</p>
    `;
  }
  return `
    <h1>Informe</h1>
    <h2>Introduccion</h2>
    <p>Contexto, antecedentes y alcance del informe.</p>
    <h2>Objetivos</h2>
    <ul><li>Objetivo general</li><li>Objetivos especificos</li></ul>
    <h2>Metodologia</h2>
    <p>Descripcion del enfoque, instrumentos y fuentes utilizadas.</p>
    <h2>Resultados</h2>
    <p>Presentacion de hallazgos principales.</p>
    <h2>Conclusiones</h2>
    <p>Sintesis de resultados y cierre.</p>
  `;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
