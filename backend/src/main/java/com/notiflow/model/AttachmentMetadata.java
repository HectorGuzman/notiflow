package com.notiflow.model;

public class AttachmentMetadata {
    private String fileName;
    private String mimeType;
    private Long sizeBytes;
    private String downloadUrl;
    private Boolean inline;
    private String cid;

    public AttachmentMetadata() {}

    public AttachmentMetadata(String fileName, String mimeType, Long sizeBytes, String downloadUrl, Boolean inline, String cid) {
        this.fileName = fileName;
        this.mimeType = mimeType;
        this.sizeBytes = sizeBytes;
        this.downloadUrl = downloadUrl;
        this.inline = inline;
        this.cid = cid;
    }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }

    public Long getSizeBytes() { return sizeBytes; }
    public void setSizeBytes(Long sizeBytes) { this.sizeBytes = sizeBytes; }

    public String getDownloadUrl() { return downloadUrl; }
    public void setDownloadUrl(String downloadUrl) { this.downloadUrl = downloadUrl; }

    public Boolean getInline() { return inline; }
    public void setInline(Boolean inline) { this.inline = inline; }

    public String getCid() { return cid; }
    public void setCid(String cid) { this.cid = cid; }
}
