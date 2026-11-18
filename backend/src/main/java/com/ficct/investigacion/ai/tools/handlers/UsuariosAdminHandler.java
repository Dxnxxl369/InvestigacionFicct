package com.ficct.investigacion.ai.tools.handlers;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ficct.investigacion.dto.CopilotoDTO.ConfirmacionPendiente;
import com.ficct.investigacion.dto.CopilotoDTO.CopilotoResponse;
import com.ficct.investigacion.model.EstadoUsuario;
import com.ficct.investigacion.model.Rol;
import com.ficct.investigacion.model.User;
import com.ficct.investigacion.repository.UserRepository;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.*;

@Component
public class UsuariosAdminHandler {

    private final UserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public UsuariosAdminHandler(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public String ejecutar(JsonNode args, User currentUser, CopilotoResponse response) throws Exception {
        if (currentUser.getRol() != Rol.ADMIN) {
            return "{\"ok\":false,\"error\":\"Esta herramienta es exclusiva para Administradores.\"}";
        }

        String accion = args.path("accion").asText("ESTADISTICAS").trim().toUpperCase(Locale.ROOT);
        List<User> todos = userRepository.findAll();

        if ("ESTADISTICAS".equals(accion)) {
            Map<String, Long> porRol = new LinkedHashMap<>();
            long activos = 0;
            long suspendidos = 0;
            for (User u : todos) {
                porRol.merge(u.getRol().name(), 1L, Long::sum);
                if (u.getEstado() == EstadoUsuario.ACTIVO) activos++;
                else suspendidos++;
            }
            return objectMapper.writeValueAsString(Map.of(
                    "ok", true,
                    "totalUsuarios", todos.size(),
                    "activos", activos,
                    "suspendidos", suspendidos,
                    "porRol", porRol
            ));
        }

        String query = normalizar(args.path("usuarioQuery").asText(""));
        if (query.isBlank()) {
            return "{\"ok\":false,\"error\":\"Indica el nombre o correo del usuario.\"}";
        }

        List<User> matches = todos.stream()
                .filter(u -> normalizar(u.getNombreCompleto()).contains(query)
                        || normalizar(u.getEmail()).contains(query))
                .toList();

        if (matches.isEmpty()) {
            return "{\"ok\":false,\"error\":\"No encontré ningún usuario que coincida con esa búsqueda.\"}";
        }

        if ("BUSCAR".equals(accion)) {
            List<Map<String, String>> lista = matches.stream().limit(8).map(u -> Map.of(
                    "nombre", u.getNombreCompleto(),
                    "correo", u.getEmail(),
                    "rol", u.getRol().name(),
                    "estado", u.getEstado().name()
            )).toList();
            return objectMapper.writeValueAsString(Map.of(
                    "ok", true,
                    "encontrados", matches.size(),
                    "usuarios", lista
            ));
        }

        if (matches.size() > 1) {
            List<String> nombres = matches.stream().limit(6).map(u -> u.getNombreCompleto() + " (" + u.getEmail() + ")").toList();
            return objectMapper.writeValueAsString(Map.of(
                    "ok", false,
                    "error", "Encontré varios usuarios: " + String.join(", ", nombres) + ". Especifica cuál."
            ));
        }

        User target = matches.get(0);
        if (target.getId().equals(currentUser.getId())) {
            return "{\"ok\":false,\"error\":\"Por seguridad no puedes suspender o cambiar tu propio rol desde el chat.\"}";
        }

        ConfirmacionPendiente conf = new ConfirmacionPendiente();
        conf.setTipoAccion("GESTIONAR_USUARIO_ADMIN");
        conf.setTargetId(target.getId());

        if ("SUSPENDER".equals(accion) || "ACTIVAR".equals(accion)) {
            String estadoDest = "SUSPENDER".equals(accion) ? "SUSPENDIDO" : "ACTIVO";
            conf.setValorTexto("ESTADO:" + estadoDest);
            conf.setTitulo(("SUSPENDER".equals(accion) ? "Suspender" : "Reactivar") + " cuenta de " + target.getNombreCompleto());
            conf.setDetalle(target.getEmail() + " · Rol: " + target.getRol().name() + " -> Estado: " + estadoDest);
        } else if ("CAMBIAR_ROL".equals(accion)) {
            String nuevoRol = args.path("nuevoRol").asText("").trim().toUpperCase(Locale.ROOT);
            if (!Set.of("ADMIN", "DOCENTE", "JURADO", "ESTUDIANTE").contains(nuevoRol)) {
                return "{\"ok\":false,\"error\":\"Rol inválido. Usa ADMIN, DOCENTE, JURADO o ESTUDIANTE.\"}";
            }
            conf.setValorTexto("ROL:" + nuevoRol);
            conf.setTitulo("Cambiar rol de " + target.getNombreCompleto() + " a " + nuevoRol);
            conf.setDetalle(target.getEmail() + " · Rol actual: " + target.getRol().name() + " -> " + nuevoRol);
        } else {
            return "{\"ok\":false,\"error\":\"Acción de usuario no soportada.\"}";
        }

        response.setAccion("CONFIRMAR_ACCION");
        response.setConfirmacionPendiente(conf);

        return objectMapper.writeValueAsString(Map.of(
                "ok", true,
                "requiereConfirmacion", true,
                "usuario", target.getNombreCompleto(),
                "correo", target.getEmail()
        ));
    }

    private String normalizar(String s) {
        if (s == null) return "";
        return Normalizer.normalize(s, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .trim();
    }
}
