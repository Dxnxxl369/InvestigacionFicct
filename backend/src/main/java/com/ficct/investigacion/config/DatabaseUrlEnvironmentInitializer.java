package com.ficct.investigacion.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;

public class DatabaseUrlEnvironmentInitializer implements ApplicationContextInitializer<ConfigurableApplicationContext> {

    private static final Logger log = LoggerFactory.getLogger(DatabaseUrlEnvironmentInitializer.class);

    @Override
    public void initialize(ConfigurableApplicationContext applicationContext) {
        ConfigurableEnvironment env = applicationContext.getEnvironment();
        String url = env.getProperty("SPRING_DATASOURCE_URL");
        if (url == null || url.isBlank()) {
            url = env.getProperty("DATABASE_URL");
        }
        if (url == null || url.isBlank()) {
            url = env.getProperty("spring.datasource.url");
        }

        if (url != null && !url.isBlank()) {
            String fixedUrl = url.trim();
            Map<String, Object> props = new HashMap<>();

            try {
                if (fixedUrl.startsWith("postgres://") || fixedUrl.startsWith("postgresql://")) {
                    String clean = fixedUrl;
                    if (clean.startsWith("postgres://")) {
                        clean = clean.substring("postgres://".length());
                    } else if (clean.startsWith("postgresql://")) {
                        clean = clean.substring("postgresql://".length());
                    }

                    URI uri = URI.create("http://" + clean);
                    String userInfo = uri.getUserInfo();
                    if (userInfo != null && userInfo.contains(":")) {
                        String[] parts = userInfo.split(":", 2);
                        props.put("spring.datasource.username", parts[0]);
                        props.put("spring.datasource.password", parts[1]);
                    }

                    int port = uri.getPort() != -1 ? uri.getPort() : 5432;
                    String path = uri.getPath();
                    String host = uri.getHost();

                    fixedUrl = "jdbc:postgresql://" + host + ":" + port + path;
                    log.info(">>> [DatabaseUrlEnvironmentInitializer] URL adaptada con exito a JDBC: {}", fixedUrl);
                }
            } catch (Exception e) {
                if (!fixedUrl.startsWith("jdbc:")) {
                    fixedUrl = "jdbc:" + fixedUrl;
                }
            }

            props.put("spring.datasource.url", fixedUrl);
            env.getPropertySources().addFirst(new MapPropertySource("fixedDatabaseProperties", props));
        }
    }
}
