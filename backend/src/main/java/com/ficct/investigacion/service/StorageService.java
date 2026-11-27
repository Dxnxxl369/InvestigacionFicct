package com.ficct.investigacion.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Abstracción de almacenamiento de archivos preparada para Amazon S3.
 * Cuando S3_ENABLED=true y las credenciales/bucket estén configurados,
 * permitirá enrutar las subidas directamente al bucket S3 configurado.
 */
@Service
public class StorageService {

    @Value("${app.s3.enabled:false}")
    private boolean s3Enabled;

    @Value("${app.s3.bucket:}")
    private String s3Bucket;

    @Value("${app.s3.region:us-east-1}")
    private String s3Region;

    @Value("${app.s3.access-key:}")
    private String s3AccessKey;

    @Value("${app.s3.secret-key:}")
    private String s3SecretKey;

    @Value("${app.s3.public-base-url:}")
    private String s3PublicBaseUrl;

    public boolean isS3Configured() {
        return s3Enabled
                && s3Bucket != null && !s3Bucket.isBlank()
                && s3AccessKey != null && !s3AccessKey.isBlank()
                && s3SecretKey != null && !s3SecretKey.isBlank();
    }

    public String getS3Bucket() {
        return s3Bucket;
    }

    public String getS3Region() {
        return s3Region;
    }

    public String getS3PublicBaseUrl() {
        if (s3PublicBaseUrl != null && !s3PublicBaseUrl.isBlank()) {
            return s3PublicBaseUrl.trim().replaceAll("/+$", "");
        }
        if (s3Bucket != null && !s3Bucket.isBlank()) {
            return "https://" + s3Bucket.trim() + ".s3." + s3Region + ".amazonaws.com";
        }
        return "";
    }
}
