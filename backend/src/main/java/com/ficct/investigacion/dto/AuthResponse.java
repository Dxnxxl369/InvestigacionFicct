package com.ficct.investigacion.dto;

import com.ficct.investigacion.model.EstadoUsuario;
import com.ficct.investigacion.model.Rol;

public class AuthResponse {

    private String token;
    private String tokenType = "Bearer";
    private Long id;
    private String nombre;
    private String apellido;
    private String email;
    private Rol rol;
    private EstadoUsuario estado;
    private String fotoPerfil;
    private String descripcion;

    public AuthResponse() {
    }

    public AuthResponse(String token, Long id, String nombre, String apellido, String email, Rol rol, EstadoUsuario estado) {
        this.token = token;
        this.id = id;
        this.nombre = nombre;
        this.apellido = apellido;
        this.email = email;
        this.rol = rol;
        this.estado = estado;
    }

    public AuthResponse(String token, Long id, String nombre, String apellido, String email, Rol rol, EstadoUsuario estado, String fotoPerfil, String descripcion) {
        this.token = token;
        this.id = id;
        this.nombre = nombre;
        this.apellido = apellido;
        this.email = email;
        this.rol = rol;
        this.estado = estado;
        this.fotoPerfil = fotoPerfil;
        this.descripcion = descripcion;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getTokenType() {
        return tokenType;
    }

    public void setTokenType(String tokenType) {
        this.tokenType = tokenType;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public Rol getRol() {
        return rol;
    }

    public void setRol(Rol rol) {
        this.rol = rol;
    }

    public EstadoUsuario getEstado() {
        return estado;
    }

    public void setEstado(EstadoUsuario estado) {
        this.estado = estado;
    }

    public String getFotoPerfil() {
        return fotoPerfil;
    }

    public void setFotoPerfil(String fotoPerfil) {
        this.fotoPerfil = fotoPerfil;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }
}
