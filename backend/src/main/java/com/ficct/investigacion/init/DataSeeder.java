package com.ficct.investigacion.init;

import com.ficct.investigacion.model.EstadoUsuario;
import com.ficct.investigacion.model.Rol;
import com.ficct.investigacion.model.RolPermiso;
import com.ficct.investigacion.model.User;
import com.ficct.investigacion.repository.RolPermisoRepository;
import com.ficct.investigacion.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UserRepository userRepository;
    private final RolPermisoRepository rolPermisoRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${feature.documentos-colaborativos.enabled:false}")
    private boolean documentosColaborativosHabilitados;

    public DataSeeder(UserRepository userRepository, RolPermisoRepository rolPermisoRepository,
                      PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.rolPermisoRepository = rolPermisoRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        seedPermisos();
        seedUsuariosBase();
    }

    private void seedUsuariosBase() {
        // 1. Administrador Principal (admin.investigacion@gmail.com / admin369)
        if (!userRepository.existsByEmail("admin.investigacion@gmail.com")) {
            userRepository.save(new User("Admin Principal", "", "admin.investigacion@gmail.com",
                    passwordEncoder.encode("admin369"), Rol.ADMIN, EstadoUsuario.ACTIVO));
            log.info(">>> [DataSeeder] Usuario ADMIN creado: admin.investigacion@gmail.com");
        }

        // 2. Administrador UAGRM (admin@uagrm.edu.bo / admin369)
        if (!userRepository.existsByEmail("admin@uagrm.edu.bo")) {
            userRepository.save(new User("Administrador", "", "admin@uagrm.edu.bo",
                    passwordEncoder.encode("admin369"), Rol.ADMIN, EstadoUsuario.ACTIVO));
            log.info(">>> [DataSeeder] Usuario ADMIN UAGRM creado: admin@uagrm.edu.bo");
        }

        // 3. Docente (docente.ficct@gmail.com / docente123)
        if (!userRepository.existsByEmail("docente.ficct@gmail.com")) {
            userRepository.save(new User("Docente Investigador", "", "docente.ficct@gmail.com",
                    passwordEncoder.encode("docente123"), Rol.DOCENTE, EstadoUsuario.ACTIVO));
            log.info(">>> [DataSeeder] Usuario DOCENTE creado: docente.ficct@gmail.com");
        }

        // 4. Estudiante (alumno.ficct@gmail.com / estudiante123)
        if (!userRepository.existsByEmail("alumno.ficct@gmail.com")) {
            userRepository.save(new User("Alumno Prueba", "", "alumno.ficct@gmail.com",
                    passwordEncoder.encode("estudiante123"), Rol.ESTUDIANTE, EstadoUsuario.ACTIVO));
            log.info(">>> [DataSeeder] Usuario ESTUDIANTE creado: alumno.ficct@gmail.com");
        }
    }

    private void seedPermisos() {
        String[] modulos = documentosColaborativosHabilitados
                ? new String[]{"CONVOCATORIAS", "USUARIOS", "DOCUMENTOS", "CERTIFICADOS"}
                : new String[]{"CONVOCATORIAS", "USUARIOS", "CERTIFICADOS"};

        for (Rol rol : Rol.values()) {
            for (String modulo : modulos) {
                if (rolPermisoRepository.existsByRolAndModulo(rol, modulo)) continue;
                boolean puedeVer = false;
                boolean puedeEditar = false;
                switch (rol) {
                    case ADMIN -> {
                        puedeVer = true;
                        puedeEditar = true;
                    }
                    case DOCENTE -> {
                        puedeVer = "CONVOCATORIAS".equals(modulo)
                                || "DOCUMENTOS".equals(modulo) || "CERTIFICADOS".equals(modulo);
                        puedeEditar = "CONVOCATORIAS".equals(modulo) || "DOCUMENTOS".equals(modulo);
                    }
                    case JURADO -> {
                        puedeVer = "CONVOCATORIAS".equals(modulo)
                                || "DOCUMENTOS".equals(modulo) || "CERTIFICADOS".equals(modulo);
                        puedeEditar = "DOCUMENTOS".equals(modulo) || "CERTIFICADOS".equals(modulo);
                    }
                    case ESTUDIANTE -> {
                        puedeVer = "CONVOCATORIAS".equals(modulo)
                                || "DOCUMENTOS".equals(modulo) || "CERTIFICADOS".equals(modulo);
                        puedeEditar = "DOCUMENTOS".equals(modulo);
                    }
                }
                rolPermisoRepository.save(new RolPermiso(rol, modulo, puedeVer, puedeEditar));
            }
        }
    }
}
