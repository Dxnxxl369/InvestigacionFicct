package com.ficct.investigacion.dto;

import com.ficct.investigacion.model.EstadoUsuario;
import jakarta.validation.constraints.NotNull;

public class UserStatusUpdateDTO {

    @NotNull(message = "El nuevo estado es obligatorio")
    private EstadoUsuario estado;

    public UserStatusUpdateDTO() {
    }

    public UserStatusUpdateDTO(EstadoUsuario estado) {
        this.estado = estado;
    }

    public EstadoUsuario getEstado() {
        return estado;
    }

    public void setEstado(EstadoUsuario estado) {
        this.estado = estado;
    }
}
