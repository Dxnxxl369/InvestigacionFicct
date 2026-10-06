package com.ficct.investigacion.service;

import com.ficct.investigacion.config.JwtService;
import com.ficct.investigacion.dto.AuthRequest;
import com.ficct.investigacion.dto.AuthResponse;
import com.ficct.investigacion.dto.PerfilUpdateRequest;
import com.ficct.investigacion.dto.RegisterRequest;
import com.ficct.investigacion.dto.UserDTO;
import com.ficct.investigacion.model.Convocatoria;
import com.ficct.investigacion.model.ConvocatoriaParticipante;
import com.ficct.investigacion.model.EstadoInscripcion;
import com.ficct.investigacion.model.EstadoUsuario;
import com.ficct.investigacion.model.Rol;
import com.ficct.investigacion.model.User;
import com.ficct.investigacion.repository.ConvocatoriaParticipanteRepository;
import com.ficct.investigacion.repository.ConvocatoriaRepository;
import com.ficct.investigacion.repository.UserRepository;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final ConvocatoriaParticipanteRepository participanteRepository;
    private final ConvocatoriaRepository convocatoriaRepository;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       AuthenticationManager authenticationManager,
                       ConvocatoriaParticipanteRepository participanteRepository,
                       ConvocatoriaRepository convocatoriaRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
        this.participanteRepository = participanteRepository;
        this.convocatoriaRepository = convocatoriaRepository;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String cleanEmail = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByEmail(cleanEmail)) {
            throw new IllegalArgumentException("Ya existe una cuenta registrada con el correo: " + cleanEmail);
        }

        Rol rolAsignado = request.getRol() != null ? request.getRol() : Rol.ESTUDIANTE;

        User user = new User(
                request.getNombre().trim(),
                request.getApellido().trim(),
                cleanEmail,
                passwordEncoder.encode(request.getPassword()),
                rolAsignado,
                EstadoUsuario.ACTIVO
        );

        User savedUser = userRepository.save(user);
        String jwtToken = jwtService.generateToken(savedUser);

        return new AuthResponse(
                jwtToken,
                savedUser.getId(),
                savedUser.getNombre(),
                savedUser.getApellido(),
                savedUser.getEmail(),
                savedUser.getRol(),
                savedUser.getEstado(),
                savedUser.getFotoPerfil(),
                savedUser.getDescripcion(),
                savedUser.getOcultarCursos()
        );
    }

    public AuthResponse login(AuthRequest request) {
        String cleanEmail = request.getEmail().trim().toLowerCase();

        // Normalización inteligente de alias o atajos al correo institucional formal
        if (!userRepository.existsByEmail(cleanEmail)) {
            if (cleanEmail.endsWith("@ficct.edu.bo")) {
                String candidate = cleanEmail.replace("@ficct.edu.bo", "@ficct.uagrm.edu.bo");
                if (userRepository.existsByEmail(candidate)) {
                    cleanEmail = candidate;
                }
            } else if (cleanEmail.endsWith("@ficct")) {
                String candidate = cleanEmail + ".uagrm.edu.bo";
                if (userRepository.existsByEmail(candidate)) {
                    cleanEmail = candidate;
                }
            }
        }

        User user = userRepository.findByEmail(cleanEmail)
                .orElseThrow(() -> new BadCredentialsException("Correo o contraseña incorrectos"));

        if (user.getEstado() == EstadoUsuario.SUSPENDIDO) {
            throw new IllegalStateException("Esta cuenta de usuario se encuentra suspendida. Contacte al administrador.");
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(user.getEmail(), request.getPassword())
            );
        } catch (Exception e) {
            throw new BadCredentialsException("Correo o contraseña incorrectos");
        }

        String jwtToken = jwtService.generateToken(user);

        return new AuthResponse(
                jwtToken,
                user.getId(),
                user.getNombre(),
                user.getApellido(),
                user.getEmail(),
                user.getRol(),
                user.getEstado(),
                user.getFotoPerfil(),
                user.getDescripcion(),
                user.getOcultarCursos()
        );
    }

    public UserDTO getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado con correo: " + email));
        return new UserDTO(user);
    }

    @Transactional
    public UserDTO updateProfile(String email, PerfilUpdateRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado con correo: " + email));

        if (request != null) {
            if (request.getFotoPerfil() != null) {
                user.setFotoPerfil(request.getFotoPerfil().trim());
            }
            if (request.getDescripcion() != null) {
                user.setDescripcion(request.getDescripcion().trim());
            }
            if (request.getOcultarCursos() != null) {
                user.setOcultarCursos(request.getOcultarCursos());
            }
        }
        User updated = userRepository.save(user);
        return new UserDTO(updated);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getPerfilPublico(Long usuarioId) {
        return getPerfilPublico(usuarioId, null);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getPerfilPublico(Long usuarioId, String currentUserEmail) {
        User user = userRepository.findById(usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con ID: " + usuarioId));

        User currentUser = null;
        if (currentUserEmail != null && !currentUserEmail.trim().isEmpty()) {
            currentUser = userRepository.findByEmail(currentUserEmail.trim().toLowerCase()).orElse(null);
        }

        boolean esMismoUsuarioOAdmin = currentUser != null && (currentUser.getId().equals(user.getId()) || currentUser.getRol() == Rol.ADMIN);

        Map<String, Object> perfil = new HashMap<>();
        perfil.put("id", user.getId());
        perfil.put("nombre", user.getNombre());
        perfil.put("apellido", user.getApellido());
        perfil.put("nombreCompleto", user.getNombreCompleto());
        perfil.put("email", user.getEmail());
        perfil.put("rol", user.getRol() != null ? user.getRol().name() : "ESTUDIANTE");
        perfil.put("fotoPerfil", user.getFotoPerfil());
        perfil.put("descripcion", user.getDescripcion());
        perfil.put("esPropioPerfil", esMismoUsuarioOAdmin);

        // Si es el mismo usuario o administrador, nunca bloquear la visualización de sus propios cursos
        if (esMismoUsuarioOAdmin) {
            perfil.put("ocultarCursos", false);
        } else {
            perfil.put("ocultarCursos", Boolean.TRUE.equals(user.getOcultarCursos()));
        }

        if (!Boolean.TRUE.equals(user.getOcultarCursos()) || esMismoUsuarioOAdmin) {
            List<Map<String, Object>> cursos = new ArrayList<>();
            java.util.Set<Long> agregados = new java.util.HashSet<>();

            // 1. Áreas donde participa como estudiante, docente asignado o jurado
            List<ConvocatoriaParticipante> misPart = participanteRepository
                    .findByUsuarioIdAndEstadoInscripcion(user.getId(), EstadoInscripcion.ACEPTADO);
            for (ConvocatoriaParticipante cp : misPart) {
                if (cp.getConvocatoria() != null && agregados.add(cp.getConvocatoria().getId())) {
                    Map<String, Object> c = new HashMap<>();
                    c.put("id", cp.getConvocatoria().getId());
                    c.put("titulo", cp.getConvocatoria().getTitulo());
                    c.put("descripcion", cp.getConvocatoria().getDescripcion());
                    c.put("tipo", cp.getConvocatoria().getTipo());
                    c.put("estado", cp.getConvocatoria().getEstado() != null ? cp.getConvocatoria().getEstado().name() : null);
                    c.put("miRol", cp.getRol() != null ? cp.getRol().name() : null);
                    cursos.add(c);
                }
            }

            // 2. Áreas donde el usuario es el creador (Docentes o Admins a cargo)
            List<Convocatoria> creadas = convocatoriaRepository.findByCreadorId(user.getId());
            for (Convocatoria conv : creadas) {
                if (conv != null && agregados.add(conv.getId())) {
                    Map<String, Object> c = new HashMap<>();
                    c.put("id", conv.getId());
                    c.put("titulo", conv.getTitulo());
                    c.put("descripcion", conv.getDescripcion());
                    c.put("tipo", conv.getTipo());
                    c.put("estado", conv.getEstado() != null ? conv.getEstado().name() : null);
                    c.put("miRol", user.getRol() != null ? user.getRol().name() : "DOCENTE");
                    cursos.add(c);
                }
            }

            perfil.put("cursos", cursos);
        } else {
            perfil.put("cursos", Collections.emptyList());
        }

        return perfil;
    }
}
