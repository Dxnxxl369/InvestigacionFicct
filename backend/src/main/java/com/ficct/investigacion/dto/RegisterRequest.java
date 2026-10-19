package com.ficct.investigacion.dto;

import com.ficct.investigacion.model.Rol;
import com.ficct.investigacion.util.CorreoPermitido;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class RegisterRequest {

    @NotBlank(message = "El nombre es obligatorio")
    @Size(min = 2, max = 100, message = "El nombre debe tener entre 2 y 100 caracteres")
    private String nombre;

    @NotBlank(message = "El apellido es obligatorio")
    @Size(min = 2, max = 100, message = "El apellido debe tener entre 2 y 100 caracteres")
    private String apellido;

    @NotBlank(message = "El correo electrónico es obligatorio")
    @Email(message = "Formato de correo electrónico inválido")
    @Pattern(regexp = CorreoPermitido.PATRON,
            message = "Usa un correo @uagrm.edu.bo o @gmail.com")
    private String email;

    @Size(max = 30, message = "El registro universitario admite hasta 30 caracteres")
    private String registroUniversitario;

    @NotBlank(message = "El celular es obligatorio")
    @Size(max = 30, message = "El celular admite hasta 30 caracteres")
    private String celular;

    @NotBlank(message = "La contraseña es obligatoria")
    @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres")
    private String password;

    private Rol rol = Rol.ESTUDIANTE;

    public RegisterRequest() {
    }

    public RegisterRequest(String nombre, String apellido, String email, String password) {
        this(nombre, apellido, email, password, Rol.ESTUDIANTE);
    }

    public RegisterRequest(String nombre, String apellido, String email, String password, Rol rol) {
        this.nombre = nombre;
        this.apellido = apellido;
        this.email = email;
        this.password = password;
        this.rol = rol != null ? rol : Rol.ESTUDIANTE;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getApellido() {
        return apellido;
    }

    public void setApellido(String apellido) {
        this.apellido = apellido;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getRegistroUniversitario() { return registroUniversitario; }

    public void setRegistroUniversitario(String registroUniversitario) { this.registroUniversitario = registroUniversitario; }

    public String getCelular() { return celular; }

    public void setCelular(String celular) { this.celular = celular; }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Rol getRol() {
        return rol;
    }

    public void setRol(Rol rol) {
        this.rol = rol;
    }
}
