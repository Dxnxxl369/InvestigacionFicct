package com.ficct.investigacion.service;

import com.ficct.investigacion.model.BibliotecaCategoria;
import com.ficct.investigacion.model.BibliotecaDocumento;
import com.ficct.investigacion.model.BibliotecaLectura;
import com.ficct.investigacion.model.User;
import com.ficct.investigacion.repository.*;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class BibliotecaServiceTest {
    @TempDir Path temp;
    private final BibliotecaCategoriaRepository categorias = mock(BibliotecaCategoriaRepository.class);
    private final BibliotecaDocumentoRepository documentos = mock(BibliotecaDocumentoRepository.class);
    private final BibliotecaLecturaRepository lecturas = mock(BibliotecaLecturaRepository.class);
    private final ConvocatoriaParticipanteRepository participantes = mock(ConvocatoriaParticipanteRepository.class);
    private final FeriaPostulacionRepository postulaciones = mock(FeriaPostulacionRepository.class);
    private final UserRepository usuarios = mock(UserRepository.class);

    private BibliotecaService service() {
        return new BibliotecaService(categorias, documentos, lecturas, participantes, postulaciones, usuarios,
                new RecomendadorBibliotecaService(), temp.toString());
    }

    @Test
    void guardaPdfEnDirectorioSeparadoYConservaMetadatos() throws Exception {
        BibliotecaCategoria categoria = new BibliotecaCategoria();
        categoria.setNombre("Feria");
        when(categorias.findById(1L)).thenReturn(Optional.of(categoria));
        when(documentos.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));
        ByteArrayOutputStream salida = new ByteArrayOutputStream();
        try (PDDocument pdf = new PDDocument()) { pdf.addPage(new PDPage()); pdf.save(salida); }
        MockMultipartFile archivo = new MockMultipartFile("archivo", "guia.pdf", "application/pdf", salida.toByteArray());

        MockMultipartFile portada = new MockMultipartFile("portada", "guia.png", "image/png",
                Base64.getDecoder().decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg=="));
        var resultado = service().crearDocumento(new BibliotecaService.DocumentoRequest(1L, "Guía de feria",
                "Lecturas de apoyo", "Programación", "Básico", true), archivo, portada);

        assertEquals("Guía de feria", resultado.titulo());
        assertEquals("guia.pdf", resultado.nombreArchivo());
        assertTrue(resultado.tienePortada());
        try (var archivos = Files.list(temp.resolve("biblioteca"))) {
            assertEquals(2, archivos.count());
        }
    }

    @Test
    void permiteLibroSinCategoriaAreaNiNivel() throws Exception {
        when(documentos.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));
        ByteArrayOutputStream salida = new ByteArrayOutputStream();
        try (PDDocument pdf = new PDDocument()) { pdf.addPage(new PDPage()); pdf.save(salida); }
        MockMultipartFile archivo = new MockMultipartFile("archivo", "libro.pdf", "application/pdf", salida.toByteArray());
        MockMultipartFile portada = new MockMultipartFile("portada", "libro.png", "image/png",
                Base64.getDecoder().decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg=="));

        var resultado = service().crearDocumento(new BibliotecaService.DocumentoRequest(null, "Libro libre",
                "Lectura general", null, null, true), archivo, portada);

        assertNull(resultado.categoriaId());
        assertNull(resultado.categoria());
        assertNull(resultado.area());
        assertNull(resultado.nivel());
    }

    @Test
    void impideAbrirPdfOcultoAlEstudiante() {
        BibliotecaDocumento documento = new BibliotecaDocumento();
        documento.setPublicado(false);
        when(documentos.findById(9L)).thenReturn(Optional.of(documento));

        assertThrows(NoSuchElementException.class, () -> service().archivo(9L, false));
        assertThrows(NoSuchElementException.class, () -> service().portada(9L, false));
    }

    @Test
    void rechazaArchivoConExtensionPdfPeroContenidoFalso() {
        BibliotecaCategoria categoria = new BibliotecaCategoria();
        categoria.setNombre("Feria");
        when(categorias.findById(1L)).thenReturn(Optional.of(categoria));
        MockMultipartFile archivo = new MockMultipartFile("archivo", "falso.pdf", "application/pdf", "texto".getBytes());

        assertThrows(IllegalArgumentException.class, () -> service().crearDocumento(
                new BibliotecaService.DocumentoRequest(1L, "Falso", "", "", "", false), archivo, null));
    }

    @Test
    void rechazaPortadaQueNoEsImagenYRetiraPdfTemporal() throws Exception {
        BibliotecaCategoria categoria = new BibliotecaCategoria();
        categoria.setNombre("Feria");
        when(categorias.findById(1L)).thenReturn(Optional.of(categoria));
        ByteArrayOutputStream salida = new ByteArrayOutputStream();
        try (PDDocument pdf = new PDDocument()) { pdf.addPage(new PDPage()); pdf.save(salida); }
        MockMultipartFile archivo = new MockMultipartFile("archivo", "guia.pdf", "application/pdf", salida.toByteArray());
        MockMultipartFile portada = new MockMultipartFile("portada", "falsa.png", "image/png", "texto".getBytes());

        assertThrows(IllegalArgumentException.class, () -> service().crearDocumento(
                new BibliotecaService.DocumentoRequest(1L, "Guía", "", "", "", true), archivo, portada));
        try (var archivos = Files.list(temp.resolve("biblioteca"))) {
            assertEquals(0, archivos.count());
        }
    }

    @Test
    void registraDescargaSoloDeDocumentoPublicadoPorEstudiante() {
        User estudiante = new User();
        estudiante.setId(7L);
        BibliotecaDocumento publicado = new BibliotecaDocumento();
        publicado.setPublicado(true);
        when(usuarios.findByEmail("alumno@ficct.edu.bo")).thenReturn(Optional.of(estudiante));
        when(documentos.findById(12L)).thenReturn(Optional.of(publicado));

        service().registrarAcceso("alumno@ficct.edu.bo", 12L, true);

        var guardado = org.mockito.ArgumentCaptor.forClass(BibliotecaLectura.class);
        verify(lecturas).save(guardado.capture());
        assertEquals(7L, guardado.getValue().getUsuarioId());
        assertEquals(12L, guardado.getValue().getDocumentoId());
        assertEquals(1, guardado.getValue().getAperturas());
        assertEquals(1, guardado.getValue().getDescargas());

        publicado.setPublicado(false);
        service().registrarAcceso("alumno@ficct.edu.bo", 12L, true);
        verify(lecturas, times(1)).save(any());
    }

    @Test
    void abrirLibroNoCuentaComoDescarga() {
        BibliotecaLectura lectura = new BibliotecaLectura();
        lectura.registrarAcceso(false);
        assertEquals(1, lectura.getAperturas());
        assertEquals(0, lectura.getDescargas());
        lectura.registrarAcceso(true);
        assertEquals(2, lectura.getAperturas());
        assertEquals(1, lectura.getDescargas());
    }
}
