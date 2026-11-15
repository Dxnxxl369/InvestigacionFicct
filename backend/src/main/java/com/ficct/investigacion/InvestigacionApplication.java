package com.ficct.investigacion;

import com.ficct.investigacion.config.DatabaseUrlEnvironmentInitializer;
import jakarta.annotation.PostConstruct;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;

import java.util.TimeZone;

@SpringBootApplication
public class InvestigacionApplication {

    @PostConstruct
    public void init() {
        TimeZone.setDefault(TimeZone.getTimeZone("America/La_Paz"));
    }

    public static void main(String[] args) {
        new SpringApplicationBuilder(InvestigacionApplication.class)
                .initializers(new DatabaseUrlEnvironmentInitializer())
                .run(args);
    }
}
