package com.ficct.investigacion.config;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class TareaJuradosSchemaMigration {
    @Bean
    ApplicationRunner migrarVisibilidadDeTareasParaJurados(JdbcTemplate jdbc) {
        return args -> {
            jdbc.execute("ALTER TABLE tareas ADD COLUMN IF NOT EXISTS visible_jurados boolean");
            // Solo se migran valores nuevos (NULL): un cambio manual posterior se conserva.
            jdbc.update("UPDATE tareas t SET visible_jurados = true FROM convocatorias c " +
                            "WHERE c.id = t.convocatoria_id AND c.tipo = 'FERIA' " +
                            "AND t.plantilla_feria = true AND t.visible_jurados IS NULL " +
                            "AND t.titulo IN (?, ?, ?, ?, ?)",
                    "Documento final para jurados", "Tríptico", "Diapositivas", "Banner", "Logo");
            jdbc.execute("UPDATE tareas SET visible_jurados = false WHERE visible_jurados IS NULL");
            jdbc.execute("ALTER TABLE tareas ALTER COLUMN visible_jurados SET DEFAULT false");
            jdbc.execute("ALTER TABLE tareas ALTER COLUMN visible_jurados SET NOT NULL");
        };
    }
}
