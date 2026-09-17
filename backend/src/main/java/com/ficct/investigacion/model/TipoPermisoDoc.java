package com.ficct.investigacion.model;

public enum TipoPermisoDoc {
    LECTURA,         // Visualizador: solo lectura
    EDICION,         // Editor: puede modificar el contenido del documento
    ADMINISTRACION   // Administrador/Co-autor: puede editar y gestionar colaboradores
}
