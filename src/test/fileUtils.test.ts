import { describe, it, expect } from "vitest";
import {
  getFileType,
  formatFileSize,
  getFileExtension,
  generateFileId,
  isValidUrl,
  getFilenameFromUrl,
  formatDuration,
} from "@/lib/fileUtils";

describe("getFileType", () => {
  it("should identify video files", () => {
    expect(getFileType("video/mp4")).toBe("video");
    expect(getFileType("video/webm")).toBe("video");
    expect(getFileType("video/x-matroska")).toBe("video");
    expect(getFileType("video/quicktime")).toBe("video");
  });

  it("should identify image files", () => {
    expect(getFileType("image/jpeg")).toBe("image");
    expect(getFileType("image/png")).toBe("image");
    expect(getFileType("image/gif")).toBe("image");
    expect(getFileType("image/webp")).toBe("image");
    expect(getFileType("image/svg+xml")).toBe("image");
  });

  it("should identify document files by keyword matching", () => {
    // The function checks for keywords in MIME type: pdf, document, text, spreadsheet, presentation
    expect(getFileType("application/pdf")).toBe("document");
    expect(getFileType("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe("document");
    expect(getFileType("text/plain")).toBe("document");
    expect(getFileType("text/html")).toBe("document");
    expect(getFileType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).toBe("document");
    expect(getFileType("application/vnd.openxmlformats-officedocument.presentationml.presentation")).toBe("document");
  });

  it("should return other for document types without matching keywords", () => {
    // These are technically documents but don't contain the keywords the function looks for
    expect(getFileType("application/msword")).toBe("other");
    expect(getFileType("application/vnd.ms-excel")).toBe("other");
    expect(getFileType("application/vnd.ms-powerpoint")).toBe("other");
  });

  it("should return other for unknown types", () => {
    expect(getFileType("application/octet-stream")).toBe("other");
    expect(getFileType("application/zip")).toBe("other");
    expect(getFileType("audio/mpeg")).toBe("other");
    expect(getFileType("")).toBe("other");
  });
});

describe("formatFileSize", () => {
  it("should format bytes", () => {
    expect(formatFileSize(0)).toBe("0 Bytes");
    expect(formatFileSize(500)).toBe("500 Bytes");
  });

  it("should format kilobytes", () => {
    expect(formatFileSize(1024)).toBe("1 KB");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(10240)).toBe("10 KB");
  });

  it("should format megabytes", () => {
    expect(formatFileSize(1048576)).toBe("1 MB");
    expect(formatFileSize(5242880)).toBe("5 MB");
    expect(formatFileSize(1572864)).toBe("1.5 MB");
  });

  it("should format gigabytes", () => {
    expect(formatFileSize(1073741824)).toBe("1 GB");
    expect(formatFileSize(2147483648)).toBe("2 GB");
  });

  it("should format terabytes", () => {
    expect(formatFileSize(1099511627776)).toBe("1 TB");
  });
});

describe("getFileExtension", () => {
  it("should extract common extensions", () => {
    expect(getFileExtension("video.mp4")).toBe("mp4");
    expect(getFileExtension("image.jpeg")).toBe("jpeg");
    expect(getFileExtension("document.pdf")).toBe("pdf");
    expect(getFileExtension("archive.tar.gz")).toBe("gz");
  });

  it("should return lowercase extension", () => {
    expect(getFileExtension("VIDEO.MP4")).toBe("mp4");
    expect(getFileExtension("Image.JPEG")).toBe("jpeg");
  });

  it("should handle files without extension", () => {
    expect(getFileExtension("filename")).toBe("");
    expect(getFileExtension("")).toBe("");
  });

  it("should handle edge cases", () => {
    expect(getFileExtension(".gitignore")).toBe("gitignore");
    expect(getFileExtension("file.")).toBe("");
    expect(getFileExtension("path/to/file.txt")).toBe("txt");
  });
});

describe("generateFileId", () => {
  it("should generate unique IDs", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateFileId());
    }
    expect(ids.size).toBe(100);
  });

  it("should generate alphanumeric strings", () => {
    const id = generateFileId();
    expect(id).toMatch(/^[a-z0-9]+$/);
  });

  it("should generate IDs of expected length", () => {
    const id = generateFileId();
    expect(id.length).toBeGreaterThan(0);
    expect(id.length).toBeLessThanOrEqual(13);
  });
});

describe("isValidUrl", () => {
  it("should validate http URLs", () => {
    expect(isValidUrl("http://example.com")).toBe(true);
    expect(isValidUrl("http://example.com/path")).toBe(true);
    expect(isValidUrl("http://example.com:8080/path?query=1")).toBe(true);
  });

  it("should validate https URLs", () => {
    expect(isValidUrl("https://example.com")).toBe(true);
    expect(isValidUrl("https://subdomain.example.com/path")).toBe(true);
  });

  it("should validate other protocols", () => {
    expect(isValidUrl("ftp://ftp.example.com")).toBe(true);
    expect(isValidUrl("file:///path/to/file")).toBe(true);
  });

  it("should reject invalid URLs", () => {
    expect(isValidUrl("not a url")).toBe(false);
    expect(isValidUrl("")).toBe(false);
    expect(isValidUrl("example.com")).toBe(false);
    expect(isValidUrl("://missing-protocol")).toBe(false);
  });
});

describe("getFilenameFromUrl", () => {
  it("should extract filename from URL", () => {
    expect(getFilenameFromUrl("https://example.com/path/to/file.mp4")).toBe("file.mp4");
    expect(getFilenameFromUrl("https://example.com/video.mkv")).toBe("video.mkv");
  });

  it("should handle encoded filenames", () => {
    expect(getFilenameFromUrl("https://example.com/my%20video.mp4")).toBe("my video.mp4");
    expect(getFilenameFromUrl("https://example.com/%E4%B8%AD%E6%96%87.txt")).toBe("中文.txt");
  });

  it("should handle URLs with query strings", () => {
    expect(getFilenameFromUrl("https://example.com/file.mp4?token=abc")).toBe("file.mp4");
  });

  it("should return null for invalid URLs", () => {
    expect(getFilenameFromUrl("not a url")).toBe(null);
  });

  it("should return null or empty for URLs without filename", () => {
    // When path is "/" or empty, the function returns empty string or null
    const result1 = getFilenameFromUrl("https://example.com/");
    const result2 = getFilenameFromUrl("https://example.com");
    // Both should be falsy (empty string or null)
    expect(result1 || null).toBe(null);
    expect(result2 || null).toBe(null);
  });
});

describe("formatDuration", () => {
  it("should format seconds only", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(5)).toBe("0:05");
    expect(formatDuration(59)).toBe("0:59");
  });

  it("should format minutes and seconds", () => {
    expect(formatDuration(60)).toBe("1:00");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(125)).toBe("2:05");
    expect(formatDuration(3599)).toBe("59:59");
  });

  it("should format hours, minutes and seconds", () => {
    expect(formatDuration(3600)).toBe("1:00:00");
    expect(formatDuration(3665)).toBe("1:01:05");
    expect(formatDuration(7325)).toBe("2:02:05");
    expect(formatDuration(36000)).toBe("10:00:00");
  });

  it("should handle edge cases", () => {
    expect(formatDuration(-1)).toBe("0:00");
    expect(formatDuration(NaN)).toBe("0:00");
  });

  it("should floor fractional seconds", () => {
    expect(formatDuration(65.7)).toBe("1:05");
    expect(formatDuration(3661.9)).toBe("1:01:01");
  });
});
