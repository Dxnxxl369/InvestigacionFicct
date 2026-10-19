package com.ficct.investigacion.model;

import java.util.List;

/** Estructura reutilizable de los módulos y entregables de Feria. */
public enum PlantillaModulo {
    PRIMER_AVANCE("Primer avance", "Primera revisión del proyecto.",
            List.of(new Actividad("Primera presentación de documento", ".pdf, .docx"))),
    SEGUNDO_AVANCE("Segundo avance", "Segunda revisión del proyecto.",
            List.of(new Actividad("Segunda presentación de documento", ".pdf, .docx"))),
    PRESENTACION_FINAL("Presentación final", "Materiales para la evaluación final de la actividad.",
            List.of(new Actividad("Documento final para jurados", ".pdf, .docx", true),
                    new Actividad("Tríptico", ".pdf, .png, .jpg, .jpeg", true),
                    new Actividad("Diapositivas", ".pdf, .ppt, .pptx", true),
                    new Actividad("Banner", ".pdf, .png, .jpg, .jpeg", true),
                    new Actividad("Logo", ".svg, .png, .jpg, .jpeg", true))),
    ACTIVIDADES("Actividades", "Entregables de la convocatoria.",
            List.of(new Actividad("Documentación", ".pdf, .docx", true),
                    new Actividad("Diapositiva", ".pdf, .ppt, .pptx", true)));

    private final String titulo;
    private final String descripcion;
    private final List<Actividad> actividades;

    PlantillaModulo(String titulo, String descripcion, List<Actividad> actividades) {
        this.titulo = titulo;
        this.descripcion = descripcion;
        this.actividades = actividades;
    }

    public String titulo() { return titulo; }
    public String descripcion() { return descripcion; }
    public List<Actividad> actividades() { return actividades; }

    public record Actividad(String titulo, String extensiones, boolean visibleJurados) {
        public Actividad(String titulo, String extensiones) {
            this(titulo, extensiones, false);
        }
    }
}
