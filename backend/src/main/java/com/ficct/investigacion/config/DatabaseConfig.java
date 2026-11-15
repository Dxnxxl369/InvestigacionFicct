package com.ficct.investigacion.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.net.URI;

@Configuration
public class DatabaseConfig {

    private static final Logger log = LoggerFactory.getLogger(DatabaseConfig.class);

    @Value("${spring.datasource.url:jdbc:postgresql://localhost:5432/investigacion_db}")
    private String rawUrl;

    @Value("${spring.datasource.username:postgres}")
    private String defaultUsername;

    @Value("${spring.datasource.password:admin369}")
    private String defaultPassword;

    @Value("${spring.datasource.driver-class-name:org.postgresql.Driver}")
    private String driverClassName;

    @Bean
    @Primary
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();
        config.setDriverClassName(driverClassName);

        String jdbcUrl = rawUrl;
        String username = defaultUsername;
        String password = defaultPassword;

        try {
            if (rawUrl != null && !rawUrl.startsWith("jdbc:")) {
                String clean = rawUrl;
                if (clean.startsWith("postgres://")) {
                    clean = clean.substring("postgres://".length());
                } else if (clean.startsWith("postgresql://")) {
                    clean = clean.substring("postgresql://".length());
                }

                URI uri = URI.create("http://" + clean);
                String userInfo = uri.getUserInfo();
                if (userInfo != null && userInfo.contains(":")) {
                    String[] parts = userInfo.split(":", 2);
                    username = parts[0];
                    password = parts[1];
                }

                int port = uri.getPort() != -1 ? uri.getPort() : 5432;
                String path = uri.getPath();
                String host = uri.getHost();

                jdbcUrl = "jdbc:postgresql://" + host + ":" + port + path;
                log.info(">>> [DatabaseConfig] URL de Render adaptada a JDBC: {} con usuario: {}", jdbcUrl, username);
            }
        } catch (Exception e) {
            log.warn(">>> [DatabaseConfig] Error parseando URL especial, usando directa: {}", e.getMessage());
            jdbcUrl = rawUrl;
        }

        config.setJdbcUrl(jdbcUrl);
        config.setUsername(username);
        config.setPassword(password);

        return new HikariDataSource(config);
    }
}
