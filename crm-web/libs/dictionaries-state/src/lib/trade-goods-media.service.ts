import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TradeGoodsMediaService {
  private readonly http = inject(HttpClient);

  /**
   * Для POST /photos бэкенд ожидает полный набор файлов:
   * уже сохранённые на сервере + новые выбранные в UI.
   */
  async buildFilesForUpload(serverUrls: string[], pendingFiles: File[]): Promise<File[]> {
    if (serverUrls.length === 0) {
      return [...pendingFiles];
    }
    const blobs = await firstValueFrom(
      forkJoin(serverUrls.map((url) => this.http.get(url, { responseType: 'blob' }))),
    );
    const fromServer: File[] = blobs.map((blob, i) => {
      const url = serverUrls[i] ?? '';
      const tail = url.split('/').pop() ?? `photo-${i + 1}.jpg`;
      const name = decodeURIComponent(tail);
      return new File([blob], name, { type: blob.type || 'image/jpeg' });
    });
    return [...fromServer, ...pendingFiles];
  }
}
