package com.ficct.investigacion.dto;

import com.ficct.investigacion.model.Rol;
import jakarta.validation.constraints.NotNull;

public class UserRoleUpdateDTO {

    @NotNull(message = "El nuevo rol es obligatorio")
    private Rol rol;

    public UserRoleUpdateDTO() {
    }

    public UserRoleUpdateDTO(Rol rol) {
        this.rol = rol;
    }

    public Rol getRol() {
        return rol;
    }

    public void setRol(Rol rol) {
        this.rol = rol;
    }
}
