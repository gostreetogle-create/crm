import type { ComplexInput } from '@srm/catalog-suite-data-access';

export function complexPayloadFromValues(v: {
  name: string;
  code: string;
  description: string;
  isActive: boolean;
}): ComplexInput {
  const code = v.code.trim();
  const description = v.description.trim();
  return {
    name: v.name.trim(),
    code: code ? code : null,
    description: description ? description : null,
    isActive: v.isActive,
  };
}
