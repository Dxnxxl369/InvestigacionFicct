package com.ficct.investigacion.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "documento_colaboradores",
    uniqueConstraints = @UniqueConstraint(columnNames = {"documento_id", "usuario_id"})
)
public class DocumentoColaborador {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "documento_id", nullable = false)
    private Documento documento;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "usuario_id", nullable = false)
    private User usuario;

    @Enumerated(EnumType.STRING)
    @Column(name = "permiso", nullable = false, length = 30)
    private TipoPermisoDoc permiso = TipoPermisoDoc.LECTURA;

    @Column(name = "fecha_asignacion", nullable = false)
    private LocalDateTime fechaAsignacion;

    public DocumentoColaborador() {
    }

    public DocumentoColaborador(Documento documento, User usuario, TipoPermisoDoc permiso) {
        this.documento = documento;
        this.usuario = usuario;
        this.permiso = permiso != null ? permiso : TipoPermisoDoc.LECTURA;
    }

    @PrePersist
    protected void onCreate() {
        this.fechaAsignacion = LocalDateTime.now();
        if (this.permiso == null) this.permiso = TipoPermisoDoc.LECTURA;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Documento getDocumento() {
        return documento;
    }

    public void setDocumento(Documento documento) {
        this.documento = documento;
    }

    public User getUsuario() {
        return usuario;
    }

    public void setUsuario(User usuario) {
        this.usuario = usuario;
    }

    public TipoPermisoDoc getPermiso() {
        return permiso;
    }

    public void setPermiso(TipoPermisoDoc permiso) {
        this.permiso = permiso;
    }

    public LocalDateTime getFechaAsignacion() {
        return fechaAsignacion;
    }

    public void setFechaAsignacion(LocalDateTime fechaAsignacion) {
        this.fechaAsignacion = fechaAsignacion;
    }
}
