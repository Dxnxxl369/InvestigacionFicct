package com.ficct.investigacion.model;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "plantilla_actividades")
public class PlantillaActividad {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plantilla_id", nullable = false)
    private PlantillaDefinicion plantilla;

    @Column(nullable = false)
    private int orden;
    @Column(nullable = false, length = 180)
    private String titulo;
    @Column(columnDefinition = "TEXT")
    private String descripcion;
    @Column(name = "tipos_archivos_permitidos", length = 150)
    private String tiposArchivosPermitidos;
    @Column(name = "tamano_maximo_mb")
    private Integer tamanoMaximoMb;
    @Column(name = "puntaje_maximo")
    private Double puntajeMaximo;
    @Column(name = "visible_jurados", nullable = false)
    private boolean visibleJurados;

    // Las filas anteriores se completan una sola vez durante la migración del catálogo.
    @Column(name = "entrega_grupal")
    private Boolean entregaGrupal;

    @ElementCollection
    @CollectionTable(name = "plantilla_actividad_adjuntos", joinColumns = @JoinColumn(name = "actividad_id"))
    @OrderColumn(name = "orden")
    private List<AdjuntoTarea> adjuntos = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "plantilla_actividad_criterios", joinColumns = @JoinColumn(name = "actividad_id"))
    @OrderColumn(name = "orden")
    private List<PlantillaCriterio> rubrica = new ArrayList<>();

    public Long getId() { return id; }
    public PlantillaDefinicion getPlantilla() { return plantilla; }
    public void setPlantilla(PlantillaDefinicion plantilla) { this.plantilla = plantilla; }
    public int getOrden() { return orden; }
    public void setOrden(int orden) { this.orden = orden; }
    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public String getTiposArchivosPermitidos() { return tiposArchivosPermitidos; }
    public void setTiposArchivosPermitidos(String tiposArchivosPermitidos) { this.tiposArchivosPermitidos = tiposArchivosPermitidos; }
    public Integer getTamanoMaximoMb() { return tamanoMaximoMb; }
    public void setTamanoMaximoMb(Integer tamanoMaximoMb) { this.tamanoMaximoMb = tamanoMaximoMb; }
    public Double getPuntajeMaximo() { return puntajeMaximo; }
    public void setPuntajeMaximo(Double puntajeMaximo) { this.puntajeMaximo = puntajeMaximo; }
    public boolean isVisibleJurados() { return visibleJurados; }
    public void setVisibleJurados(boolean visibleJurados) { this.visibleJurados = visibleJurados; }
    public Boolean getEntregaGrupal() { return entregaGrupal; }
    public void setEntregaGrupal(Boolean entregaGrupal) { this.entregaGrupal = entregaGrupal; }
    public List<AdjuntoTarea> getAdjuntos() { return adjuntos; }
    public List<PlantillaCriterio> getRubrica() { return rubrica; }
}
