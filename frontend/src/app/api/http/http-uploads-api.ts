import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { UploadsApi } from '../apis/uploads-api';
import { HttpBaseApi } from './http-base-api';

function extensionFromFile(file: File): string {
  const m = /(\.[a-zA-Z0-9]+)$/.exec(file.name);
  if (m?.[1]) return m[1];
  if (file.type === 'image/png') return '.png';
  if (file.type === 'image/webp') return '.webp';
  if (file.type === 'image/gif') return '.gif';
  if (file.type === 'image/jpeg') return '.jpg';
  return '';
}

function publicUploadsUrl(savedAs: string): string {
  const raw = String(savedAs ?? '').trim().replace(/\\/g, '/');
  if (!raw) return '/pictures/placeholder.png';
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  if (raw.startsWith('/uploads/')) return raw;
  if (raw.startsWith('./uploads/')) return '/uploads/' + raw.slice('./uploads/'.length);
  if (raw.startsWith('uploads/')) return '/uploads/' + raw.slice('uploads/'.length);
  const idx = raw.indexOf('/uploads/');
  if (idx >= 0) return raw.slice(idx);
  return raw;
}

@Injectable()
export class HttpUploadsApi extends UploadsApi {
  constructor(private readonly base: HttpBaseApi) {
    super();
  }

  uploadRecipeImage(file: File): Observable<string> {
    return this.uploadToFolder(file, 'recipes');
  }

  uploadRecipeStepImage(file: File): Observable<string> {
    return this.uploadToFolder(file, 'steps');
  }

  private uploadToFolder(file: File, folder: string): Observable<string> {
    const form = new FormData();
    const ext = extensionFromFile(file);
    const name = `recipe_${Date.now()}${ext}`;
    form.set('file', file);
    form.set('path', folder);
    form.set('name', name);

    return this.base.http.post<any>(`${this.base.baseUrl}/upload`, form).pipe(map((r) => publicUploadsUrl(r?.file?.savedAs)));
  }
}

