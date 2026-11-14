package com.ficct.investigacion.config;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class BibliotecaSchemaMigration {
    @Bean
    ApplicationRunner permitirLibrosSinCategoria(JdbcTemplate jdbc) {
        return args -> {
            jdbc.execute("ALTER TABLE biblioteca_documentos ALTER COLUMN categoria_id DROP NOT NULL");
            jdbc.execute("ALTER TABLE biblioteca_lecturas ADD COLUMN IF NOT EXISTS descargas integer DEFAULT 0");
            jdbc.execute("UPDATE biblioteca_lecturas SET descargas = 0 WHERE descargas IS NULL");
            jdbc.execute("ALTER TABLE biblioteca_lecturas ALTER COLUMN descargas SET DEFAULT 0");
        };
    }
}
