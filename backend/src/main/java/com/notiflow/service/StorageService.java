package com.notiflow.service;

import com.google.cloud.storage.Acl;
import com.google.cloud.storage.Blob;
import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Service
public class StorageService {

    private final Storage storage;
    private final String bucketName;

    public StorageService(Storage storage, @Value("${app.logo-bucket:}") String bucketName) {
        this.storage = storage;
        this.bucketName = bucketName;
    }

    public boolean isEnabled() {
        return bucketName != null && !bucketName.isBlank();
    }

    public String uploadLogo(String schoolId, MultipartFile file) throws IOException {
        if (!isEnabled()) {
            throw new IllegalStateException("Bucket de logos no configurado");
        }
        String ext = "";
        if (file.getOriginalFilename() != null && file.getOriginalFilename().contains(".")) {
            ext = file.getOriginalFilename().substring(file.getOriginalFilename().lastIndexOf('.'));
        }
        String objectName = "logos/" + schoolId + "/" + UUID.randomUUID() + ext;
        BlobId blobId = BlobId.of(bucketName, objectName);
        BlobInfo blobInfo = BlobInfo.newBuilder(blobId)
                .setContentType(file.getContentType() != null ? file.getContentType() : "application/octet-stream")
                .build();
        Blob blob = storage.create(blobInfo, file.getBytes());
        // Hacer público el logo
        storage.createAcl(blob.getBlobId(), Acl.of(Acl.User.ofAllUsers(), Acl.Role.READER));
        return String.format("https://storage.googleapis.com/%s/%s", bucketName, objectName);
    }
}
