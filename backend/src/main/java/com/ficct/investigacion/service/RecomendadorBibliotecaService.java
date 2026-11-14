package com.ficct.investigacion.service;

import com.ficct.investigacion.model.BibliotecaDocumento;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

/** Perfil de contenido TF-IDF que se adapta a las lecturas del estudiante. */
@Service
public class RecomendadorBibliotecaService {
    private static final Set<String> VACIAS = Set.of("para", "como", "este", "esta", "desde", "sobre",
            "entre", "documento", "proyecto", "investigacion", "trabajo", "grado", "feria", "los", "las",
            "del", "con", "una", "uno", "por", "que", "sus", "son", "al", "de", "la", "el", "en", "un", "y");

    public record Contexto(String area, String nivel, String tema) {}
    public record Lectura(Long documentoId, int aperturas, LocalDateTime ultimoAcceso) {}
    public record Resultado(BibliotecaDocumento documento, double puntaje, String motivo) {}
    private record Candidato(BibliotecaDocumento documento, Map<String, Double> vector,
                             double puntaje, String motivo) {}

    public List<Resultado> recomendar(List<BibliotecaDocumento> documentos, Contexto contexto) {
        return recomendar(documentos, contexto == null ? List.of() : List.of(contexto), List.of(), Map.of());
    }

    public List<Resultado> recomendar(List<BibliotecaDocumento> documentos, List<Contexto> contextos,
                                      List<Lectura> lecturas) {
        return recomendar(documentos, contextos, lecturas, Map.of());
    }

    public List<Resultado> recomendar(List<BibliotecaDocumento> documentos, List<Contexto> contextos,
                                      List<Lectura> lecturas, Map<Long, Long> descargasPorDocumento) {
        if (documentos == null || documentos.isEmpty()) return List.of();
        List<Contexto> ferias = contextos == null ? List.of() : contextos;
        List<Lectura> historial = lecturas == null ? List.of() : lecturas;
        Map<Long, Long> popularidad = descargasPorDocumento == null ? Map.of() : descargasPorDocumento;
        if (ferias.isEmpty() && historial.isEmpty() && popularidad.isEmpty()) return List.of();

        Map<Long, BibliotecaDocumento> porId = new HashMap<>();
        Map<BibliotecaDocumento, Map<String, Double>> frecuencias = new IdentityHashMap<>();
        Map<String, Integer> apariciones = new HashMap<>();
        for (BibliotecaDocumento documento : documentos) {
            if (documento.getId() != null) porId.put(documento.getId(), documento);
            Map<String, Double> tf = new HashMap<>();
            agregar(tf, documento.getTitulo(), 4);
            agregar(tf, documento.getDescripcion(), 2);
            agregar(tf, documento.getArea(), 4);
            agregar(tf, documento.getNivel(), 2);
            if (documento.getCategoria() != null) agregar(tf, documento.getCategoria().getNombre(), 2);
            agregar(tf, limitar(documento.getTextoExtraido(), 30000), 0.35);
            frecuencias.put(documento, tf);
            for (String termino : tf.keySet()) apariciones.merge(termino, 1, Integer::sum);
        }
        Map<BibliotecaDocumento, Map<String, Double>> vectores = new IdentityHashMap<>();
        for (BibliotecaDocumento documento : documentos)
            vectores.put(documento, normalizarVector(tfidf(frecuencias.get(documento), apariciones, documentos.size())));

        Map<String, Double> consulta = new HashMap<>();
        for (int i = 0; i < Math.min(ferias.size(), 5); i++) {
            Contexto feria = ferias.get(i);
            double peso = 1.0 / (1 + i * 0.6);
            agregar(consulta, feria.area(), 4 * peso);
            agregar(consulta, feria.nivel(), 2 * peso);
            agregar(consulta, feria.tema(), 5 * peso);
        }
        Map<String, Double> perfilFeria = normalizarVector(tfidf(consulta, apariciones, documentos.size()));

        Map<String, Double> perfilLecturas = new HashMap<>();
        Set<Long> leidos = new HashSet<>();
        LocalDateTime ahora = LocalDateTime.now();
        for (Lectura lectura : historial.stream().limit(20).toList()) {
            BibliotecaDocumento documento = porId.get(lectura.documentoId());
            if (documento == null) continue;
            leidos.add(lectura.documentoId());
            long dias = lectura.ultimoAcceso() == null ? 0
                    : Math.max(0, ChronoUnit.DAYS.between(lectura.ultimoAcceso(), ahora));
            double peso = (1 + Math.log1p(Math.min(lectura.aperturas(), 20))) * Math.exp(-dias / 120.0);
            sumar(perfilLecturas, vectores.get(documento), peso);
        }
        perfilLecturas = normalizarVector(perfilLecturas);
        boolean tienePerfil = !perfilFeria.isEmpty() || !perfilLecturas.isEmpty();
        if (!tienePerfil && popularidad.isEmpty()) return List.of();
        Map<String, Double> perfil = new HashMap<>();
        sumar(perfil, perfilFeria, perfilLecturas.isEmpty() ? 1 : 0.7);
        sumar(perfil, perfilLecturas, perfilFeria.isEmpty() ? 1 : 0.3);
        perfil = normalizarVector(perfil);
        long maxDescargas = documentos.stream().mapToLong(d -> d.getId() == null ? 0L : popularidad.getOrDefault(d.getId(), 0L))
                .max().orElse(0);

        List<Candidato> candidatos = new ArrayList<>();
        boolean hayNuevos = documentos.stream().anyMatch(d -> d.getId() == null || !leidos.contains(d.getId()));
        for (BibliotecaDocumento documento : documentos) {
            if (hayNuevos && leidos.contains(documento.getId())) continue;
            boolean mismaArea = ferias.stream().anyMatch(c -> coincide(c.area(), documento.getArea()));
            boolean mismoNivel = ferias.stream().anyMatch(c -> coincide(c.nivel(), documento.getNivel()));
            double similitud = producto(perfil, vectores.get(documento));
            double relevancia = 0.85 * similitud + (mismaArea ? 0.1 : 0) + (mismoNivel ? 0.05 : 0);
            long descargas = documento.getId() == null ? 0L : popularidad.getOrDefault(documento.getId(), 0L);
            double popular = maxDescargas == 0 ? 0 : Math.log1p(descargas) / Math.log1p(maxDescargas);
            double puntaje = tienePerfil ? 0.8 * relevancia + 0.2 * popular : popular;
            if (puntaje <= 0) continue;
            String motivo = mismaArea && mismoNivel ? "Relacionado con el área y nivel de tu feria"
                    : mismaArea ? "Relacionado con el área de tu feria"
                    : mismoNivel ? "Relacionado con el nivel de tu feria"
                    : producto(perfilLecturas, vectores.get(documento)) > 0.03 ? "Similar a tus lecturas recientes"
                    : descargas > 0 && (similitud < 0.03 || !tienePerfil) ? "Popular entre estudiantes"
                    : "Relacionado con el tema de tu proyecto";
            candidatos.add(new Candidato(documento, vectores.get(documento), puntaje, motivo));
        }

        // Reordenación MMR: conserva pertinencia y reduce títulos casi idénticos en la primera fila.
        List<Candidato> elegidos = new ArrayList<>();
        while (!candidatos.isEmpty() && elegidos.size() < 12) {
            Candidato mejor = null;
            double mejorValor = Double.NEGATIVE_INFINITY;
            for (Candidato candidato : candidatos) {
                double repeticion = elegidos.stream().mapToDouble(e -> producto(candidato.vector(), e.vector()))
                        .max().orElse(0);
                double valor = 0.85 * candidato.puntaje() - 0.15 * repeticion;
                if (valor > mejorValor || (valor == mejorValor && mejor != null
                        && candidato.documento().getTitulo().compareToIgnoreCase(mejor.documento().getTitulo()) < 0)) {
                    mejor = candidato;
                    mejorValor = valor;
                }
            }
            elegidos.add(mejor);
            candidatos.remove(mejor);
        }
        return elegidos.stream().map(c -> new Resultado(c.documento(),
                Math.round(c.puntaje() * 10000) / 10000.0, c.motivo())).toList();
    }

    private static boolean coincide(String a, String b) {
        return a != null && b != null && a.equalsIgnoreCase(b);
    }

    private static String limitar(String texto, int longitud) {
        return texto == null ? "" : texto.substring(0, Math.min(texto.length(), longitud));
    }

    private static void agregar(Map<String, Double> destino, String texto, double peso) {
        if (texto == null || texto.isBlank()) return;
        String normal = Normalizer.normalize(texto.toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        for (String parte : normal.split("[^a-z0-9]+"))
            if (parte.length() > 2 && !VACIAS.contains(parte)) destino.merge(parte, peso, Double::sum);
    }

    private static Map<String, Double> tfidf(Map<String, Double> tf, Map<String, Integer> df, int total) {
        Map<String, Double> resultado = new HashMap<>();
        tf.forEach((termino, frecuencia) -> {
            double idf = Math.log((total + 1.0) / (df.getOrDefault(termino, 0) + 1.0)) + 1.0;
            resultado.put(termino, Math.log1p(frecuencia) * idf);
        });
        return resultado;
    }

    private static Map<String, Double> normalizarVector(Map<String, Double> vector) {
        double norma = Math.sqrt(vector.values().stream().mapToDouble(v -> v * v).sum());
        if (norma == 0) return Map.of();
        Map<String, Double> normal = new HashMap<>();
        vector.forEach((termino, peso) -> normal.put(termino, peso / norma));
        return normal;
    }

    private static void sumar(Map<String, Double> destino, Map<String, Double> origen, double peso) {
        origen.forEach((termino, valor) -> destino.merge(termino, valor * peso, Double::sum));
    }

    private static double producto(Map<String, Double> a, Map<String, Double> b) {
        if (a.size() > b.size()) return producto(b, a);
        double valor = 0;
        for (var entrada : a.entrySet()) valor += entrada.getValue() * b.getOrDefault(entrada.getKey(), 0.0);
        return valor;
    }
}
