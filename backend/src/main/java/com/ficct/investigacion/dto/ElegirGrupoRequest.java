package com.ficct.investigacion.dto;

public class ElegirGrupoRequest {
    private Long grupoId;

    public ElegirGrupoRequest() {
    }

    public ElegirGrupoRequest(Long grupoId) {
        this.grupoId = grupoId;
    }

    public Long getGrupoId() {
        return grupoId;
    }

    public void setGrupoId(Long grupoId) {
        this.grupoId = grupoId;
    }
}
