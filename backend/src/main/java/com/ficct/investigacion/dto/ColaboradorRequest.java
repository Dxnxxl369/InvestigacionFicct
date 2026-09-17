package com.ficct.investigacion.dto;

import com.ficct.investigacion.model.TipoPermisoDoc;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class ColaboradorRequest {

    @NotBlank(message = "El correo electronico del colaborador es obligatorio")
    @Email(message = "Debe proporcionar un correo electronico valido")
    private String email;

    @NotNull(message = "El nivel de permiso es obligatorio (LECTURA, EDICION, ADMINISTRACION)")
    private TipoPermisoDoc permiso = TipoPermisoDoc.LECTURA;

    public ColaboradorRequest() {
    }

    public ColaboradorRequest(String email, TipoPermisoDoc permiso) {
        this.email = email;
        this.permiso = permiso;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public TipoPermisoDoc getPermiso() {
        return permiso;
    }

    public void setPermiso(TipoPermisoDoc permiso) {
        this.permiso = permiso;
    }
}
