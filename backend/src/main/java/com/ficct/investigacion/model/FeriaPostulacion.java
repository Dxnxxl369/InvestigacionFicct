package com.ficct.investigacion.model;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "feria_postulaciones")
public class FeriaPostulacion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "convocatoria_id", nullable = false)
    private Convocatoria convocatoria;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "participante_id", nullable = false)
    private ConvocatoriaParticipante participante;

    @Column(nullable = false, length = 300)
    private String tema;
    @Column(nullable = false, length = 150)
    private String area;
    @Column(nullable = false, length = 100)
    private String categoria;
    @Column(nullable = false, length = 150)
    private String materia;
    @Column(nullable = false, length = 30)
    private String sigla;
    @Column(name = "grupo_materia", nullable = false, length = 50)
    private String grupoMateria;
    @Column(nullable = false, length = 180)
    private String docente;

    @Column(name = "codigo_equipo", length = 30)
    private String codigoEquipo;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_inscripcion", length = 30)
    private EstadoInscripcion estadoInscripcion;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "feria_integrantes", joinColumns = @JoinColumn(name = "postulacion_id"))
    @OrderColumn(name = "orden")
    private List<FeriaIntegrante> integrantes = new ArrayList<>();

    public FeriaPostulacion() {}

    public FeriaPostulacion(Convocatoria convocatoria, ConvocatoriaParticipante participante) {
        this.convocatoria = convocatoria;
        this.participante = participante;
    }

    public Long getId() { return id; }
    public Convocatoria getConvocatoria() { return convocatoria; }
    public ConvocatoriaParticipante getParticipante() { return participante; }
    public String getTema() { return tema; }
    public void setTema(String tema) { this.tema = tema; }
    public String getArea() { return area; }
    public void setArea(String area) { this.area = area; }
    public String getCategoria() { return categoria; }
    public void setCategoria(String categoria) { this.categoria = categoria; }
    public String getMateria() { return materia; }
    public void setMateria(String materia) { this.materia = materia; }
    public String getSigla() { return sigla; }
    public void setSigla(String sigla) { this.sigla = sigla; }
    public String getGrupoMateria() { return grupoMateria; }
    public void setGrupoMateria(String grupoMateria) { this.grupoMateria = grupoMateria; }
    public String getDocente() { return docente; }
    public void setDocente(String docente) { this.docente = docente; }
    public String getCodigoEquipo() { return codigoEquipo; }
    public void setCodigoEquipo(String codigoEquipo) { this.codigoEquipo = codigoEquipo; }
    public EstadoInscripcion getEstadoInscripcion() {
        return estadoInscripcion != null ? estadoInscripcion : participante.getEstadoInscripcion();
    }
    public void setEstadoInscripcion(EstadoInscripcion estadoInscripcion) { this.estadoInscripcion = estadoInscripcion; }
    public List<FeriaIntegrante> getIntegrantes() { return integrantes; }
    public void setIntegrantes(List<FeriaIntegrante> integrantes) {
        this.integrantes.clear();
        this.integrantes.addAll(integrantes);
    }
}
