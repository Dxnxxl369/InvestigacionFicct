package com.ficct.investigacion.dto;

import com.ficct.investigacion.util.CorreoPermitido;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CrearJuradoRequest(
        @NotBlank @Size(min = 2, max = 100) String nombre,
        @NotBlank @Size(min = 2, max = 100) String apellido,
        @NotBlank @Email @Pattern(regexp = CorreoPermitido.PATRON) String correo,
        @NotBlank @Size(min = 8) String contrasena
) {}
