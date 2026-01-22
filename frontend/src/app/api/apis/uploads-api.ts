import { Observable } from 'rxjs';

export abstract class UploadsApi {
  abstract uploadRecipeImage(file: File): Observable<string>;
  abstract uploadRecipeStepImage(file: File): Observable<string>;
}

