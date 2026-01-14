import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class HttpBaseApi {
  readonly baseUrl = environment.apiBaseUrl.replace(/\/$/, '');

  constructor(readonly http: HttpClient) {}
}

