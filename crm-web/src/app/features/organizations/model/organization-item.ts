export type OrganizationItem = {
  id: string;
  name: string;
  shortName?: string;
  legalForm?: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  okpo?: string;
  phone?: string;
  email?: string;
  website?: string;
  legalAddress?: string;
  postalAddress?: string;
  bankName?: string;
  bankBik?: string;
  bankAccount?: string;
  bankCorrAccount?: string;
  signerName?: string;
  signerPosition?: string;
  notes?: string;
  isActive: boolean;
  contactIds: string[];
  contactLabels: string[];
};

export type OrganizationItemInput = Omit<OrganizationItem, 'id'>;
