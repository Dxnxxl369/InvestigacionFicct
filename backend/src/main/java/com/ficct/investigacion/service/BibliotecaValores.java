package com.ficct.investigacion.service;

import java.util.List;

public final class BibliotecaValores {
    private BibliotecaValores() {}

    public static final List<String> AREAS = List.of(
            "Matemáticas y Física", "Metodología de Investigación", "Programación",
            "Creación de Startup", "Desarrollo de Software", "Redes y Telecomunicaciones",
            "Administrativas y Financieras", "Robótica");
    public static final List<String> NIVELES = List.of("Básico", "Intermedio", "Avanzado");

    public static String area(String valor) {
        if (valor == null || valor.isBlank()) return null;
        return AREAS.stream().filter(a -> a.equalsIgnoreCase(valor.trim())).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Selecciona un área válida."));
    }

    public static String nivel(String valor) {
        if (valor == null || valor.isBlank()) return null;
        return NIVELES.stream().filter(n -> n.equalsIgnoreCase(valor.trim())).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Selecciona un nivel válido."));
    }
}
