import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { ClientItem, ClientItemInput } from './client-item';
import { ClientsRepository } from './clients.repository';

function newId(): string {
  return `cli-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

const SEED: ClientItem[] = [
  {
    id: 'cli-seed-ivanov',
    lastName: 'Иванов',
    firstName: 'Пётр',
    patronymic: 'Сергеевич',
    phone: '+7 495 000-00-01',
    address: 'Москва, ул. Примерная, д. 1',
    email: 'ivanov.ps@example.test',
    notes: 'Постоплата 14 дней',
    clientMarkupPercent: 12,
    isActive: true,
    passportSeries: '',
    passportNumber: '',
    passportIssuedBy: '',
    passportIssuedDate: '',
  },
  {
    id: 'cli-seed-smirnova',
    lastName: 'Смирнова',
    firstName: 'Анна',
    patronymic: 'Викторовна',
    phone: '+7 912 000-00-02',
    address: '',
    email: '',
    notes: '',
    clientMarkupPercent: null,
    isActive: true,
    passportSeries: '4010',
    passportNumber: '123456',
    passportIssuedBy: 'ОУФМС по г. Москве',
    passportIssuedDate: '2015-03-20',
  },
];

@Injectable()
export class ClientsMockRepository implements ClientsRepository {
  private readonly itemsSubject = new BehaviorSubject<ClientItem[]>(SEED);

  getItems(): Observable<ClientItem[]> {
    return this.itemsSubject.asObservable();
  }

  create(input: ClientItemInput): Observable<ClientItem> {
    const row: ClientItem = { id: newId(), ...input };
    this.itemsSubject.next([row, ...this.itemsSubject.value]);
    return of(row);
  }

  update(id: string, input: ClientItemInput): Observable<ClientItem> {
    const row: ClientItem = { id, ...input };
    this.itemsSubject.next(this.itemsSubject.value.map((x) => (x.id === id ? row : x)));
    return of(row);
  }

  remove(id: string): Observable<void> {
    this.itemsSubject.next(this.itemsSubject.value.filter((x) => x.id !== id));
    return of(void 0);
  }
}
