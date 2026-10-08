package com.ficct.investigacion.service;

import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class DocumentoLiveVersionService {

    private final ConcurrentMap<Long, AtomicLong> liveVersions = new ConcurrentHashMap<>();

    public long currentVersion(Long documentoId) {
        return liveVersions.computeIfAbsent(documentoId, ignored -> new AtomicLong(0)).get();
    }

    public long nextVersion(Long documentoId) {
        return liveVersions.computeIfAbsent(documentoId, ignored -> new AtomicLong(0)).incrementAndGet();
    }

    public long markPersistedChange(Long documentoId) {
        return nextVersion(documentoId);
    }
}
