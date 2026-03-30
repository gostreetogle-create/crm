import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { OrganizationsRepository } from './organizations.repository';
import { OrganizationItem, OrganizationItemInput } from '../model/organization-item';

function newId(): string {
  return `org-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

const SEED: OrganizationItem[] = [
  {
    id: 'org-seed-streetiron',
    name: 'ООО "Стрит Айрон Производство"',
    shortName: 'ООО "Стрит Айрон"',
    legalForm: 'ООО',
    inn: '7701234567',
    kpp: '770101001',
    ogrn: '1237700001112',
    okpo: '12345678',
    phone: '+7 495 111-22-33',
    email: 'office@streetiron.example',
    website: 'https://streetiron.example',
    legalAddress: 'г. Москва, ул. Производственная, д. 10',
    postalAddress: 'г. Москва, а/я 15',
    bankName: 'ПАО Сбербанк',
    bankBik: '044525225',
    bankAccount: '40702810900000000001',
    bankCorrAccount: '30101810400000000225',
    signerName: 'Иванов Петр Сергеевич',
    signerPosition: 'Генеральный директор',
    notes: 'Базовая организация для КП',
    isActive: true,
    contactIds: ['cli-seed-ivanov', 'cli-seed-smirnova'],
    contactLabels: ['Иванов Пётр Сергеевич', 'Смирнова Анна Викторовна'],
  },
  {
    id: 'org-seed-ip-demo',
    name: 'Индивидуальный предприниматель Сидоров Алексей Петрович',
    shortName: 'ИП Сидоров А.П.',
    legalForm: 'ИП',
    inn: '770123456789',
    kpp: undefined,
    ogrn: '319774600123456',
    okpo: '',
    phone: '+7 903 000-00-00',
    email: 'sidorov-ip@example.com',
    website: '',
    legalAddress: 'г. Москва',
    postalAddress: '',
    bankName: 'ПАО Сбербанк',
    bankBik: '044525225',
    bankAccount: '40802810900000000002',
    bankCorrAccount: '30101810400000000225',
    signerName: 'Сидоров Алексей Петрович',
    signerPosition: 'ИП',
    notes: 'Пример для теста ИП',
    isActive: true,
    contactIds: [],
    contactLabels: [],
  },
];

@Injectable()
export class OrganizationsMockRepository implements OrganizationsRepository {
  private readonly itemsSubject = new BehaviorSubject<OrganizationItem[]>(SEED);

  getItems(): Observable<OrganizationItem[]> {
    return this.itemsSubject.asObservable();
  }

  create(input: OrganizationItemInput): Observable<OrganizationItem> {
    const row: OrganizationItem = { id: newId(), ...input };
    this.itemsSubject.next([row, ...this.itemsSubject.value]);
    return of(row);
  }

  update(id: string, input: OrganizationItemInput): Observable<OrganizationItem> {
    const row: OrganizationItem = { id, ...input };
    this.itemsSubject.next(this.itemsSubject.value.map((x) => (x.id === id ? row : x)));
    return of(row);
  }

  remove(id: string): Observable<void> {
    this.itemsSubject.next(this.itemsSubject.value.filter((x) => x.id !== id));
    return of(void 0);
  }
}
