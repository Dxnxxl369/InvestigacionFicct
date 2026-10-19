package com.ficct.investigacion.model;

import jakarta.persistence.*;

@Entity
@Table(name = "jurado_asignaciones")
public class JuradoAsignacion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "convocatoria_id", nullable = false)
    private Convocatoria convocatoria;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "jurado_participante_id", nullable = false)
    private ConvocatoriaParticipante jurado;

    @Column(nullable = false)
    private boolean todos;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "feria_postulacion_id")
    private FeriaPostulacion feriaPostulacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "grupo_id")
    private Grupo grupo;

    public JuradoAsignacion() {}

    public JuradoAsignacion(Convocatoria convocatoria, ConvocatoriaParticipante jurado,
                           boolean todos, FeriaPostulacion feriaPostulacion, Grupo grupo) {
        this.convocatoria = convocatoria;
        this.jurado = jurado;
        this.todos = todos;
        this.feriaPostulacion = feriaPostulacion;
        this.grupo = grupo;
    }

    public Long getId() { return id; }
    public ConvocatoriaParticipante getJurado() { return jurado; }
    public boolean isTodos() { return todos; }
    public FeriaPostulacion getFeriaPostulacion() { return feriaPostulacion; }
    public Grupo getGrupo() { return grupo; }
}
