package com.ficct.investigacion.model;

import jakarta.persistence.*;

@Entity
@Table(name = "rol_permisos", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"rol", "modulo"})
})
public class RolPermiso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Rol rol;

    @Column(nullable = false, length = 50)
    private String modulo;

    @Column(nullable = false)
    private boolean puedeVer = true;

    @Column(nullable = false)
    private boolean puedeEditar = false;

    public RolPermiso() {
    }

    public RolPermiso(Rol rol, String modulo, boolean puedeVer, boolean puedeEditar) {
        this.rol = rol;
        this.modulo = modulo;
        this.puedeVer = puedeVer;
        this.puedeEditar = puedeEditar;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Rol getRol() {
        return rol;
    }

    public void setRol(Rol rol) {
        this.rol = rol;
    }

    public String getModulo() {
        return modulo;
    }

    public void setModulo(String modulo) {
        this.modulo = modulo;
    }

    public boolean isPuedeVer() {
        return puedeVer;
    }

    public void setPuedeVer(boolean puedeVer) {
        this.puedeVer = puedeVer;
    }

    public boolean isPuedeEditar() {
        return puedeEditar;
    }

    public void setPuedeEditar(boolean puedeEditar) {
        this.puedeEditar = puedeEditar;
    }
}
