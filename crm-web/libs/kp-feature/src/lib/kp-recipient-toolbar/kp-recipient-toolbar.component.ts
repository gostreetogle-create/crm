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
import { DICTIONARIES_HUB_BASE, STANDALONE_DICTIONARY_CREATE } from '@srm/dictionaries-hub-feature';
import type { OrganizationItem } from '@srm/organizations-data-access';
import { LucidePlus } from '@lucide/angular';
import { UiButtonComponent } from '@srm/ui-kit';
import {
  filterKpClients,
  filterKpOrganizations,
  getKpClientLabel,
  getKpOrganizationOptionLabel,
  getKpRecipientDisplayLabel,
  parseKpRecipient,
} from '../kp-utils';
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

  private pathForStandaloneCreate(key: 'organizations' | 'clients'): string | null {
    return STANDALONE_DICTIONARY_CREATE.find((r) => r.key === key)?.path ?? null;
  }

  openAddOrganization(): void {
    const seg = this.pathForStandaloneCreate('organizations');
    if (!seg) {
      return;
    }
    void this.router.navigateByUrl(`${DICTIONARIES_HUB_BASE}/${seg}`);
  }

  openAddContact(): void {
    const seg = this.pathForStandaloneCreate('clients');
    if (!seg) {
      return;
    }
    void this.router.navigateByUrl(`${DICTIONARIES_HUB_BASE}/${seg}`);
  }

  organizationOptionLabel(org: OrganizationItem): string {
    return getKpOrganizationOptionLabel(org);
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
    return parseKpRecipient(
      String(this.recipientCtrl?.value ?? '').trim(),
      this.organizations,
      KP_RECIPIENT_ORG_PREFIX,
      KP_RECIPIENT_CONTACT_PREFIX,
    );
  }

  selectedOrganization(): OrganizationItem | null {
    const p = this.parseRecipient();
    if (!p || p.type !== 'org') {
      return null;
    }
    return this.organizations.find((o) => o.id === p.id) ?? null;
  }

  filteredOrganizations(): OrganizationItem[] {
    return filterKpOrganizations(this.organizations, this.organizationSearchCtrl?.value, this.selectedOrganization());
  }

  filteredClients(): ClientItem[] {
    return filterKpClients(this.clients, this.organizationSearchCtrl?.value, this.selectedContact());
  }

  clientLabel(c: ClientItem): string {
    return getKpClientLabel(c);
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
    return getKpRecipientDisplayLabel(this.selectedOrganization(), this.selectedContact());
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
