import {
  Component,
  ElementRef,
  HostListener,
  inject,
  Input,
  ViewChild,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import type { ClientItem } from '@srm/clients-data-access';
import { formatClientFio } from '@srm/clients-data-access';
import { DICTIONARIES_HUB_BASE, STANDALONE_DICTIONARY_CREATE } from '@srm/dictionaries-hub-feature';
import type { OrganizationItem } from '@srm/organizations-data-access';
import { LucidePlus } from '@lucide/angular';
import { UiButtonComponent } from '@srm/ui-kit';
import {
  KP_RECIPIENT_CONTACT_PREFIX,
  KP_RECIPIENT_ORG_PREFIX,
} from '../kp-document-template/kp-document-template.component';

@Component({
  selector: 'app-kp-recipient-toolbar',
  standalone: true,
  imports: [ReactiveFormsModule, UiButtonComponent, LucidePlus],
  templateUrl: './kp-recipient-toolbar.component.html',
  styleUrl: './kp-recipient-toolbar.component.scss',
})
export class KpRecipientToolbarComponent {
  private readonly router = inject(Router);

  readonly recipientPanelOpen = signal(false);

  @ViewChild('recipientCombo', { read: ElementRef }) private recipientComboRef?: ElementRef<HTMLElement>;

  @Input({ required: true }) organizations!: readonly OrganizationItem[];
  @Input({ required: true }) clients!: readonly ClientItem[];
  @Input({ required: true }) recipientCtrl!: FormControl<string>;
  @Input({ required: true }) organizationSearchCtrl!: FormControl<string>;
  @Input({ required: true }) organizationContactIdCtrl!: FormControl<string>;

  openAddOrganization(): void {
    const seg = STANDALONE_DICTIONARY_CREATE.find((r) => r.key === 'organizations')!.path;
    void this.router.navigateByUrl(`${DICTIONARIES_HUB_BASE}/${seg}`);
  }

  openAddContact(): void {
    const seg = STANDALONE_DICTIONARY_CREATE.find((r) => r.key === 'clients')!.path;
    void this.router.navigateByUrl(`${DICTIONARIES_HUB_BASE}/${seg}`);
  }

  organizationOptionLabel(org: OrganizationItem): string {
    const s = org.shortName?.trim();
    return s || org.name;
  }

  orgOptionValue(org: OrganizationItem): string {
    return `${KP_RECIPIENT_ORG_PREFIX}${org.id}`;
  }

  clientOptionValue(c: ClientItem): string {
    return `${KP_RECIPIENT_CONTACT_PREFIX}${c.id}`;
  }

  private parseRecipient():
    | { type: 'org'; id: string }
    | { type: 'contact'; id: string }
    | null {
    const raw = String(this.recipientCtrl?.value ?? '').trim();
    if (!raw) {
      return null;
    }
    if (raw.startsWith(KP_RECIPIENT_ORG_PREFIX)) {
      const id = raw.slice(KP_RECIPIENT_ORG_PREFIX.length).trim();
      return id ? { type: 'org', id } : null;
    }
    if (raw.startsWith(KP_RECIPIENT_CONTACT_PREFIX)) {
      const id = raw.slice(KP_RECIPIENT_CONTACT_PREFIX.length).trim();
      return id ? { type: 'contact', id } : null;
    }
    const legacyOrg = this.organizations.find((o) => o.id === raw);
    return legacyOrg ? { type: 'org', id: raw } : null;
  }

  selectedOrganization(): OrganizationItem | null {
    const p = this.parseRecipient();
    if (!p || p.type !== 'org') {
      return null;
    }
    return this.organizations.find((o) => o.id === p.id) ?? null;
  }

  filteredOrganizations(): OrganizationItem[] {
    const q = (this.organizationSearchCtrl?.value ?? '').trim().toLowerCase();
    const list = this.organizations.filter((o) => o.isActive);
    const filtered = !q
      ? [...list]
      : list.filter(
          (o) =>
            o.name.toLowerCase().includes(q) || (o.shortName?.toLowerCase().includes(q) ?? false),
        );
    const sel = this.selectedOrganization();
    if (sel && q && !filtered.some((o) => o.id === sel.id)) {
      return [sel, ...filtered];
    }
    return filtered;
  }

  filteredClients(): ClientItem[] {
    const q = (this.organizationSearchCtrl?.value ?? '').trim().toLowerCase();
    const list = this.clients.filter((c) => c.isActive);
    const match = (c: ClientItem) => {
      if (!q) {
        return true;
      }
      const fio = formatClientFio(c).toLowerCase();
      return (
        fio.includes(q) ||
        (c.email?.toLowerCase().includes(q) ?? false) ||
        (c.phone?.includes(q) ?? false) ||
        (c.address?.toLowerCase().includes(q) ?? false)
      );
    };
    let filtered = list.filter(match);
    const sel = this.selectedContact();
    if (sel && q && !filtered.some((c) => c.id === sel.id)) {
      filtered = [sel, ...filtered];
    }
    return filtered;
  }

  clientLabel(c: ClientItem): string {
    return formatClientFio(c);
  }

  selectedContact(): ClientItem | null {
    const p = this.parseRecipient();
    if (!p || p.type !== 'contact') {
      return null;
    }
    return this.clients.find((c) => c.id === p.id) ?? null;
  }

  contactsLinkedToOrganization(org: OrganizationItem): ClientItem[] {
    if (!org.contactIds?.length) {
      return [];
    }
    const byId = new Map(this.clients.map((c) => [c.id, c]));
    const out: ClientItem[] = [];
    for (const id of org.contactIds) {
      const c = byId.get(id);
      if (c?.isActive) {
        out.push(c);
      }
    }
    return out;
  }

  recipientDisplayLabel(): string {
    const org = this.selectedOrganization();
    if (org) {
      return this.organizationOptionLabel(org);
    }
    const c = this.selectedContact();
    if (c) {
      return this.clientLabel(c);
    }
    return '— не выбрано —';
  }

  toggleRecipientPanel(ev?: Event): void {
    ev?.stopPropagation();
    this.recipientPanelOpen.update((v) => !v);
  }

  pickRecipient(value: string, ev?: Event): void {
    ev?.stopPropagation();
    ev?.preventDefault();
    this.recipientCtrl.setValue(value);
    this.recipientPanelOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(ev: MouseEvent): void {
    if (!this.recipientPanelOpen()) {
      return;
    }
    const root = this.recipientComboRef?.nativeElement;
    if (!root) {
      return;
    }
    const t = ev.target;
    if (t instanceof Node && root.contains(t)) {
      return;
    }
    this.recipientPanelOpen.set(false);
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Escape' && this.recipientPanelOpen()) {
      this.recipientPanelOpen.set(false);
    }
  }
}
