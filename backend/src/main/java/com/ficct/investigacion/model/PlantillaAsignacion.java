package com.ficct.investigacion.model;

import jakarta.persistence.*;

@Entity
@Table(name = "plantilla_asignaciones", uniqueConstraints =
        @UniqueConstraint(columnNames = {"tipo_convocatoria", "plantilla_id"}))
public class PlantillaAsignacion {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_convocatoria", nullable = false, length = 30)
    private TipoConvocatoria tipo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plantilla_id", nullable = false)
    private PlantillaDefinicion plantilla;

    @Column(nullable = false)
    private int orden;

    public PlantillaAsignacion() {}
    public PlantillaAsignacion(TipoConvocatoria tipo, PlantillaDefinicion plantilla, int orden) {
        this.tipo = tipo;
        this.plantilla = plantilla;
        this.orden = orden;
    }
    public TipoConvocatoria getTipo() { return tipo; }
    public PlantillaDefinicion getPlantilla() { return plantilla; }
    public int getOrden() { return orden; }
}
