package com.ficct.investigacion.service;

import com.ficct.investigacion.model.BibliotecaDocumento;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.time.LocalDateTime;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class RecomendadorBibliotecaServiceTest {
    private final RecomendadorBibliotecaService service = new RecomendadorBibliotecaService();

    @Test
    void priorizaDocumentoRelacionadoConAreaNivelYTema() {
        BibliotecaDocumento software = documento("Arquitectura de software", "Desarrollo de Software", "Intermedio",
                "Diseño de aplicaciones y patrones de arquitectura");
        BibliotecaDocumento redes = documento("Redes inalámbricas", "Redes y Telecomunicaciones", "Avanzado",
                "Configuración de antenas y protocolos de red");

        var resultados = service.recomendar(List.of(redes, software),
                new RecomendadorBibliotecaService.Contexto("Desarrollo de Software", "Intermedio", "arquitectura de aplicaciones"));

        assertFalse(resultados.isEmpty());
        assertSame(software, resultados.get(0).documento());
        assertTrue(resultados.get(0).puntaje() > 0);
    }

    @Test
    void noAtribuyeRecomendacionesPersonalizadasSinPostulacion() {
        BibliotecaDocumento documento = documento("Guía de investigación", null, null, "Métodos de estudio");
        assertTrue(service.recomendar(List.of(documento), null).isEmpty());
    }

    @Test
    void aprendeDeLecturasYProponeOtroLibroDelMismoTema() {
        BibliotecaDocumento leido = documento("Introducción a Python", null, null, "programación python algoritmos");
        BibliotecaDocumento sugerido = documento("Algoritmos con Python", null, null, "programación python ejercicios");
        BibliotecaDocumento distinto = documento("Redes de computadoras", null, null, "routers protocolos antenas");
        ReflectionTestUtils.setField(leido, "id", 1L);
        ReflectionTestUtils.setField(sugerido, "id", 2L);
        ReflectionTestUtils.setField(distinto, "id", 3L);

        var resultados = service.recomendar(List.of(leido, distinto, sugerido), List.of(),
                List.of(new RecomendadorBibliotecaService.Lectura(1L, 3, LocalDateTime.now())));

        assertFalse(resultados.isEmpty());
        assertSame(sugerido, resultados.get(0).documento());
        assertTrue(resultados.stream().noneMatch(r -> r.documento() == leido));
        assertEquals("Similar a tus lecturas recientes", resultados.get(0).motivo());
    }

    @Test
    void incorporaInteresesDeMasDeUnaFeria() {
        BibliotecaDocumento software = documento("Desarrollo de Software", "Desarrollo de Software", "Intermedio", "arquitectura");
        BibliotecaDocumento robotica = documento("Robótica educativa", "Robótica", "Básico", "sensores");

        var resultados = service.recomendar(List.of(software, robotica), List.of(
                new RecomendadorBibliotecaService.Contexto("Desarrollo de Software", "Intermedio", "arquitectura"),
                new RecomendadorBibliotecaService.Contexto("Robótica", "Básico", "sensores")), List.of());

        assertEquals(2, resultados.size());
        assertTrue(resultados.stream().anyMatch(r -> r.documento() == software));
        assertTrue(resultados.stream().anyMatch(r -> r.documento() == robotica));
    }

    @Test
    void recomiendaLosMasDescargadosAunqueElEstudianteAunNoTengaHistorial() {
        BibliotecaDocumento popular = documento("Introducción a robótica", null, null, "sensores motores");
        BibliotecaDocumento menosDescargado = documento("Guía de matemáticas", null, null, "álgebra cálculo");
        ReflectionTestUtils.setField(popular, "id", 21L);
        ReflectionTestUtils.setField(menosDescargado, "id", 22L);

        var resultados = service.recomendar(List.of(menosDescargado, popular), List.of(), List.of(),
                Map.of(21L, 8L, 22L, 2L));

        assertEquals(2, resultados.size());
        assertSame(popular, resultados.get(0).documento());
        assertEquals("Popular entre estudiantes", resultados.get(0).motivo());
    }

    @Test
    void interesPersonalPesaMasQuePopularidadDeTemaAjeno() {
        BibliotecaDocumento pertinente = documento("Programación en Python", null, null, "python algoritmos");
        BibliotecaDocumento ajeno = documento("Administración financiera", null, null, "contabilidad presupuestos");
        ReflectionTestUtils.setField(pertinente, "id", 31L);
        ReflectionTestUtils.setField(ajeno, "id", 32L);

        var resultados = service.recomendar(List.of(ajeno, pertinente),
                List.of(new RecomendadorBibliotecaService.Contexto(null, null, "python algoritmos")), List.of(),
                Map.of(31L, 1L, 32L, 40L));

        assertSame(pertinente, resultados.get(0).documento());
    }

    private BibliotecaDocumento documento(String titulo, String area, String nivel, String texto) {
        BibliotecaDocumento documento = new BibliotecaDocumento();
        documento.setTitulo(titulo);
        documento.setArea(area);
        documento.setNivel(nivel);
        documento.setTextoExtraido(texto);
        return documento;
    }
}
