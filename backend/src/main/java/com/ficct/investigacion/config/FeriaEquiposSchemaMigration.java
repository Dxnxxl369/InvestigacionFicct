package com.ficct.investigacion.config;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class FeriaEquiposSchemaMigration {
    @Bean
    ApplicationRunner migrarRestriccionesEquipos(JdbcTemplate jdbc) {
        return args -> {
            quitarUnicoAnterior(jdbc, "feria_postulaciones", "UNIQUE (participante_id)");
            quitarUnicoAnterior(jdbc, "tarea_entregas", "UNIQUE (tarea_id, estudiante_id)");
            jdbc.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_entrega_feria_equipo " +
                    "ON tarea_entregas (tarea_id, feria_postulacion_id) " +
                    "WHERE feria_postulacion_id IS NOT NULL");
            jdbc.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_entrega_individual " +
                    "ON tarea_entregas (tarea_id, estudiante_id) " +
                    "WHERE feria_postulacion_id IS NULL");
        };
    }

    private void quitarUnicoAnterior(JdbcTemplate jdbc, String tabla, String definicion) {
        String sql = "SELECT conname FROM pg_constraint WHERE conrelid = ?::regclass " +
                "AND contype = 'u' AND pg_get_constraintdef(oid) = ?";
        for (String nombre : jdbc.queryForList(sql, String.class, tabla, definicion)) {
            jdbc.execute("ALTER TABLE " + tabla + " DROP CONSTRAINT \"" + nombre.replace("\"", "\"\"") + "\"");
        }
    }
}
