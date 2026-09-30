package com.ficct.investigacion.service;

import com.ficct.investigacion.config.JwtService;
import com.ficct.investigacion.dto.AuthRequest;
import com.ficct.investigacion.dto.AuthResponse;
import com.ficct.investigacion.dto.PerfilUpdateRequest;
import com.ficct.investigacion.dto.RegisterRequest;
import com.ficct.investigacion.dto.UserDTO;
import com.ficct.investigacion.model.EstadoUsuario;
import com.ficct.investigacion.model.Rol;
import com.ficct.investigacion.model.User;
import com.ficct.investigacion.repository.UserRepository;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
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
                savedUser.getDescripcion()
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
                user.getDescripcion()
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
}
