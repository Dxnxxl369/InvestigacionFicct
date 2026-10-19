package com.ficct.investigacion.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CorreoPermitidoTest {
    @Test
    void aceptaCorreosUniversitariosYGmail() {
        assertTrue(CorreoPermitido.esValido("alumno@uagrm.edu.bo"));
        assertTrue(CorreoPermitido.esValido("daniel@gmail.com"));
        assertTrue(CorreoPermitido.esValido("Nombre.Apellido@GMAIL.COM"));
    }

    @Test
    void rechazaOtrosDominiosYCorreosIncompletos() {
        assertFalse(CorreoPermitido.esValido("alumno@otro.edu.bo"));
        assertFalse(CorreoPermitido.esValido("alumno@gmail.com.ejemplo"));
        assertFalse(CorreoPermitido.esValido("@gmail.com"));
        assertFalse(CorreoPermitido.esValido("alumno@uagrm.edu.bo@gmail.com"));
    }
}
