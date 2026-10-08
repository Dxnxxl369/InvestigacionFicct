package com.ficct.investigacion.dto;

import java.util.Map;
import java.util.List;

public class DocumentoLiveMessage {
    private Long documentoId;
    private String type;
    private String sessionId;
    private String usuario;
    private String html;
    private Map<String, Object> settings;
    private List<Map<String, Object>> steps;
    private Integer cursorFrom;
    private Integer cursorTo;
    private String color;
    private Long baseVersion;
    private Long serverVersion;
    private boolean stale;
    private String at;

    public Long getDocumentoId() {
        return documentoId;
    }

    public void setDocumentoId(Long documentoId) {
        this.documentoId = documentoId;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getUsuario() {
        return usuario;
    }

    public void setUsuario(String usuario) {
        this.usuario = usuario;
    }

    public String getHtml() {
        return html;
    }

    public void setHtml(String html) {
        this.html = html;
    }

    public Map<String, Object> getSettings() {
        return settings;
    }

    public void setSettings(Map<String, Object> settings) {
        this.settings = settings;
    }

    public List<Map<String, Object>> getSteps() {
        return steps;
    }

    public void setSteps(List<Map<String, Object>> steps) {
        this.steps = steps;
    }

    public Integer getCursorFrom() {
        return cursorFrom;
    }

    public void setCursorFrom(Integer cursorFrom) {
        this.cursorFrom = cursorFrom;
    }

    public Integer getCursorTo() {
        return cursorTo;
    }

    public void setCursorTo(Integer cursorTo) {
        this.cursorTo = cursorTo;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public Long getBaseVersion() {
        return baseVersion;
    }

    public void setBaseVersion(Long baseVersion) {
        this.baseVersion = baseVersion;
    }

    public Long getServerVersion() {
        return serverVersion;
    }

    public void setServerVersion(Long serverVersion) {
        this.serverVersion = serverVersion;
    }

    public boolean isStale() {
        return stale;
    }

    public void setStale(boolean stale) {
        this.stale = stale;
    }

    public String getAt() {
        return at;
    }

    public void setAt(String at) {
        this.at = at;
    }
}
