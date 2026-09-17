package com.ficct.investigacion.dto;

import com.ficct.investigacion.model.Rol;
import com.ficct.investigacion.model.RolPermiso;

public class RolPermisoDTO {

    private Long id;
    private Rol rol;
    private String modulo;
    private boolean puedeVer;
    private boolean puedeEditar;

    public RolPermisoDTO() {
    }

    public RolPermisoDTO(RolPermiso rp) {
        this.id = rp.getId();
        this.rol = rp.getRol();
        this.modulo = rp.getModulo();
        this.puedeVer = rp.isPuedeVer();
        this.puedeEditar = rp.isPuedeEditar();
    }

    public RolPermisoDTO(Rol rol, String modulo, boolean puedeVer, boolean puedeEditar) {
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
