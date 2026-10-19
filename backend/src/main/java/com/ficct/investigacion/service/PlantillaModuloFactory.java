package com.ficct.investigacion.service;

import com.ficct.investigacion.model.*;
import com.ficct.investigacion.repository.ModuloRepository;
import com.ficct.investigacion.repository.TareaRepository;

/** Crea módulos a partir de un catálogo común, sin compartir registros entre convocatorias. */
final class PlantillaModuloFactory {
    private PlantillaModuloFactory() {}

    static Modulo crear(Convocatoria convocatoria, User creador, PlantillaModulo plantilla,
                       int orden, ModuloRepository modulos, TareaRepository tareas) {
        Modulo modulo = modulos.save(new Modulo(convocatoria, plantilla.titulo(),
                plantilla.descripcion(), null, orden, true));
        for (PlantillaModulo.Actividad actividad : plantilla.actividades()) {
            Tarea tarea = new Tarea(convocatoria, actividad.titulo(),
                    "Fecha de inicio y fecha de entrega por definir.",
                    null, null, null, false, actividad.extensiones(), 15, 100.0, creador);
            tarea.setModulo(modulo);
            tarea.setPlantillaModulo(true);
            tarea.setVisibleJurados(actividad.visibleJurados());
            if (convocatoria.getModalidadInscripcion() == ModalidadInscripcion.GRUPAL) {
                tarea.setPlantillaFeria(convocatoria.getTipo() == TipoConvocatoria.FERIA);
                tarea.setEsGrupal(true);
            }
            tareas.save(tarea);
        }
        return modulo;
    }
}
