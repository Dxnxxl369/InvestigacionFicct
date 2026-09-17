package com.ficct.investigacion.service;

import com.ficct.investigacion.dto.UserDTO;
import com.ficct.investigacion.model.EstadoUsuario;
import com.ficct.investigacion.model.Rol;
import com.ficct.investigacion.model.User;
import com.ficct.investigacion.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<UserDTO> getAllUsers(String query) {
        List<User> users;
        if (query != null && !query.trim().isEmpty()) {
            users = userRepository.searchUsers(query.trim());
        } else {
            users = userRepository.findAll();
        }
        return users.stream().map(UserDTO::new).collect(Collectors.toList());
    }

    public UserDTO getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con ID: " + id));
        return new UserDTO(user);
    }

    @Transactional
    public UserDTO updateRole(Long id, Rol newRole, String requestingAdminEmail) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con ID: " + id));

        user.setRol(newRole);
        User updated = userRepository.save(user);
        return new UserDTO(updated);
    }

    @Transactional
    public UserDTO updateStatus(Long id, EstadoUsuario newStatus, String requestingAdminEmail) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con ID: " + id));

        if (user.getEmail().equalsIgnoreCase(requestingAdminEmail) && newStatus == EstadoUsuario.SUSPENDIDO) {
            throw new IllegalArgumentException("No puedes suspender tu propia cuenta de administrador.");
        }

        user.setEstado(newStatus);
        User updated = userRepository.save(user);
        return new UserDTO(updated);
    }
}
