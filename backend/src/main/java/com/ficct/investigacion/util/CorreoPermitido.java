package com.ficct.investigacion.util;

import java.util.regex.Pattern;

public final class CorreoPermitido {
    public static final String PATRON = "^[A-Za-z0-9._%+-]+@(uagrm\\.edu\\.bo|gmail\\.com)$";
    private static final Pattern VALIDACION = Pattern.compile(PATRON, Pattern.CASE_INSENSITIVE);

    private CorreoPermitido() {}

    public static boolean esValido(String correo) {
        return correo != null && VALIDACION.matcher(correo.trim()).matches();
    }
}
