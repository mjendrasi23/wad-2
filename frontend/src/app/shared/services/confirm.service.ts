import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { ConfirmDialog, ConfirmDialogData } from '../components/confirm-dialog/confirm-dialog';

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  constructor(private readonly dialog: MatDialog) {}

  open(data: ConfirmDialogData): Observable<boolean> {
    return this.dialog.open(ConfirmDialog, { data, width: '420px' }).afterClosed();
  }
}

