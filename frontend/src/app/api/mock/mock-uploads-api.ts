import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { UploadsApi } from '../apis/uploads-api';

@Injectable()
export class MockUploadsApi extends UploadsApi {
  uploadRecipeImage(file: File): Observable<string> {
    return of(URL.createObjectURL(file));
  }

  uploadRecipeStepImage(file: File): Observable<string> {
    return of(URL.createObjectURL(file));
  }
}

