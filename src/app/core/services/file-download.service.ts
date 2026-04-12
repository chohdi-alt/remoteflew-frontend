import { Injectable } from '@angular/core';
import { HttpResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class FileDownloadService {
  downloadFromResponse(response: HttpResponse<Blob>, fallbackFileName = 'download'): void {
    const blob = response.body;
    if (!blob) {
      throw new Error('Missing file payload in download response.');
    }

    const filename = this.extractFilename(response.headers.get('content-disposition'), fallbackFileName);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private extractFilename(contentDisposition: string | null, fallbackFileName: string): string {
    if (!contentDisposition) {
      return fallbackFileName;
    }

    const filenameStarMatch = /filename\*\s*=\s*(?:UTF-8''|utf-8''|)([^;]+)/i.exec(contentDisposition);
    if (filenameStarMatch?.[1]) {
      const cleaned = this.stripQuotes(filenameStarMatch[1].trim());
      try {
        return decodeURIComponent(cleaned);
      } catch {
        return cleaned || fallbackFileName;
      }
    }

    const filenameMatch = /filename\s*=\s*([^;]+)/i.exec(contentDisposition);
    if (filenameMatch?.[1]) {
      const cleaned = this.stripQuotes(filenameMatch[1].trim());
      return cleaned || fallbackFileName;
    }

    return fallbackFileName;
  }

  private stripQuotes(value: string): string {
    return value.replace(/^["']|["']$/g, '');
  }
}

