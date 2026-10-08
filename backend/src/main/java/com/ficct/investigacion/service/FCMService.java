package com.ficct.investigacion.service;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.Nullable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class FCMService {

    private static final Logger log = LoggerFactory.getLogger(FCMService.class);

    private final FirebaseMessaging firebaseMessaging;

    public FCMService(@Autowired(required = false) @Nullable FirebaseMessaging firebaseMessaging) {
        this.firebaseMessaging = firebaseMessaging;
    }

    public boolean isDisponible() {
        return firebaseMessaging != null;
    }

    @Async
    public void enviarPush(String fcmToken, String titulo, String cuerpo, Map<String, String> data) {
        if (firebaseMessaging == null || fcmToken == null || fcmToken.isBlank()) {
            return;
        }

        try {
            Message.Builder mb = Message.builder()
                    .setToken(fcmToken)
                    .setNotification(Notification.builder()
                            .setTitle(titulo)
                            .setBody(cuerpo)
                            .build());

            if (data != null && !data.isEmpty()) {
                mb.putAllData(data);
            }

            String response = firebaseMessaging.send(mb.build());
            log.info(">>> [FCMService] Push enviada con éxito a token [{}...]: ID={}",
                    fcmToken.length() > 10 ? fcmToken.substring(0, 10) : fcmToken, response);
        } catch (Exception e) {
            log.warn(">>> [FCMService] No se pudo enviar push a token: {}. Causa: {}",
                    fcmToken.length() > 10 ? fcmToken.substring(0, 10) : fcmToken, e.getMessage());
        }
    }
}
