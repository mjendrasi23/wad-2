import { Component, Input } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { ImageCrop } from '../../../api/models/recipe';

function normalizePublicUrl(input: string): string {
  const raw = String(input ?? '').trim();
  if (!raw) return '/pictures/placeholder.png';
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;

  const url = raw.replace(/\\/g, '/');
  if (url.startsWith('/uploads/') || url.startsWith('/pictures/')) return url;
  if (url.startsWith('./uploads/')) return '/uploads/' + url.slice('./uploads/'.length);
  if (url.startsWith('uploads/')) return '/uploads/' + url.slice('uploads/'.length);
  if (url.startsWith('./pictures/')) return '/pictures/' + url.slice('./pictures/'.length);
  if (url.startsWith('pictures/')) return '/pictures/' + url.slice('pictures/'.length);
  return url;
}

function resolveBackendAssetUrl(pathOrUrl: string): string {
  const url = normalizePublicUrl(pathOrUrl);
  if (/^(https?:|data:|blob:)/i.test(url)) return url;

  const apiBase = String(environment.apiBaseUrl ?? '').trim();
  if (!/^https?:\/\//i.test(apiBase)) return url;

  try {
    return new URL(url, apiBase).toString();
  } catch {
    return url;
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

@Component({
  selector: 'app-recipe-image',
  standalone: false,
  templateUrl: './recipe-image.html',
  styleUrl: './recipe-image.scss',
})
export class RecipeImage {
  @Input() src?: string;
  @Input() alt = '';
  @Input() crop?: ImageCrop;
  @Input() loading: 'lazy' | 'eager' = 'lazy';

  get resolvedSrc(): string {
    return resolveBackendAssetUrl(this.src ?? '');
  }

  get originX(): number {
    return clamp(Number(this.crop?.originX ?? 50), 0, 100);
  }

  get originY(): number {
    return clamp(Number(this.crop?.originY ?? 50), 0, 100);
  }

  get zoom(): number {
    return clamp(Number(this.crop?.zoom ?? 1), 1, 4);
  }
}

