import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class HttpBaseApi {
  readonly baseUrl = environment.apiBaseUrl.replace(/\/$/, '');

  constructor(readonly http: HttpClient) {}

  params(input: Record<string, unknown>): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(input)) {
      if (value === undefined || value === null) continue;
      if (value === '') continue;
      if (Array.isArray(value)) {
        for (const v of value) {
          if (v === undefined || v === null) continue;
          if (v === '') continue;
          params = params.append(key, String(v));
        }
        continue;
      }
      params = params.set(key, String(value));
    }
    return params;
  }
}
