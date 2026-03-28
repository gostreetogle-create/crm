import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ClientItem, ClientItemInput } from '../model/client-item';
import { ClientsRepository } from './clients.repository';

function newId(): string {
  return `cli-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

const SEED: ClientItem[] = [
  {
    id: 'cli-seed-technoprom',
    name: 'ООО «ТехноПром»',
    code: 'TECH-01',
    clientMarkupPercent: 12,
    email: 'zakaz@technoprom.example',
    phone: '+7 495 000-00-01',
    notes: 'Постоплата 14 дней',
    isActive: true,
  },
  {
    id: 'cli-seed-smirnov',
    name: 'ИП Смирнов А.В.',
    code: 'IP-SMR',
    clientMarkupPercent: null,
    email: '',
    phone: '+7 912 000-00-02',
    notes: '',
    isActive: true,
  },
];

@Injectable()
export class ClientsMockRepository implements ClientsRepository {
  private readonly itemsSubject = new BehaviorSubject<ClientItem[]>(SEED);

  getItems(): Observable<ClientItem[]> {
    return this.itemsSubject.asObservable();
  }

  create(input: ClientItemInput): void {
    this.itemsSubject.next([{ id: newId(), ...input }, ...this.itemsSubject.value]);
  }

  update(id: string, input: ClientItemInput): void {
    this.itemsSubject.next(this.itemsSubject.value.map((x) => (x.id === id ? { id, ...input } : x)));
  }

  remove(id: string): void {
    this.itemsSubject.next(this.itemsSubject.value.filter((x) => x.id !== id));
  }
}
