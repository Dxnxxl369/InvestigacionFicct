package com.ficct.investigacion.model;

import jakarta.persistence.*;

/**
 * Puntaje otorgado por el evaluador a una entrega en un criterio de la rubrica.
 */
@Entity
@Table(
    name = "entrega_puntajes_criterio",
    uniqueConstraints = @UniqueConstraint(columnNames = {"entrega_id", "criterio_id"})
)
public class EntregaPuntajeCriterio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entrega_id", nullable = false)
    private EntregaTarea entrega;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "criterio_id", nullable = false)
    private RubricaCriterio criterio;

    @Column(nullable = false)
    private Double puntaje;

    public EntregaPuntajeCriterio() {
    }

    public EntregaPuntajeCriterio(EntregaTarea entrega, RubricaCriterio criterio, Double puntaje) {
        this.entrega = entrega;
        this.criterio = criterio;
        this.puntaje = puntaje;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public EntregaTarea getEntrega() { return entrega; }
    public void setEntrega(EntregaTarea entrega) { this.entrega = entrega; }
    public RubricaCriterio getCriterio() { return criterio; }
    public void setCriterio(RubricaCriterio criterio) { this.criterio = criterio; }
    public Double getPuntaje() { return puntaje; }
    public void setPuntaje(Double puntaje) { this.puntaje = puntaje; }
}
