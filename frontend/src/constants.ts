/**
 * Constants for venture forms — stages, legal status, African countries.
 */
export const STAGES = [
  { value: 'IDEA', label: 'Idea' },
  { value: 'PROTOTYPE', label: 'Prototype' },
  { value: 'MVP', label: 'MVP (Minimum Viable Product)' },
  { value: 'REVENUE', label: 'Generating Revenue' },
  { value: 'SCALING', label: 'Scaling' },
] as const;

export const LEGAL_STATUSES = [
  { value: 'UNREGISTERED', label: 'Not yet registered' },
  { value: 'IN_PROGRESS', label: 'Registration in progress' },
  { value: 'REGISTERED', label: 'Registered business' },
] as const;

export const AFRICAN_COUNTRIES = [
  'Nigeria', 'Kenya', 'South Africa', 'Egypt', 'Ghana', 'Ethiopia', 'Tanzania', 'Uganda',
  'Morocco', 'Ivory Coast', 'Tunisia', 'Cameroon', 'Senegal', 'Zimbabwe', 'Zambia',
  'Rwanda', 'Botswana', 'Mozambique', 'Angola', 'Malawi', 'Mali', 'Burkina Faso',
  'Niger', 'Benin', 'Togo', 'Sierra Leone', 'Liberia', 'Gambia', 'Mauritius',
  'Namibia', 'Lesotho', 'Eswatini', 'Seychelles', 'Comoros', 'Mauritania',
] as const;
