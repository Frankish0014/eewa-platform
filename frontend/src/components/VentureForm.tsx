/**
 * Venture form — create/edit with fundability fields (Africa-ready).
 */
import type { Project, Sector } from '../api/client';
import type { ProjectCreateInput } from '../api/client';
import { STAGES, LEGAL_STATUSES, AFRICAN_COUNTRIES } from '../constants';
import styles from './VentureForm.module.css';

interface VentureFormProps {
  sectors: Sector[];
  venture?: Project | null;
  onSubmit: (data: ProjectCreateInput & { status?: string }) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  mode: 'create' | 'edit';
}

export default function VentureForm({
  sectors,
  venture,
  onSubmit,
  onCancel,
  isSubmitting,
  mode,
}: VentureFormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const get = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)?.value?.trim() || undefined;
    const getNum = (name: string) => {
      const v = (form.elements.namedItem(name) as HTMLInputElement)?.value;
      return v === '' ? undefined : Number(v);
    };

    const data: ProjectCreateInput & { status?: string } = {
      sectorId: get('sectorId') || sectors[0]?.id,
      title: get('title')!,
      description: get('description'),
      problemStatement: get('problemStatement'),
      targetMarket: get('targetMarket'),
      businessModel: get('businessModel'),
      fundingAmountSought: getNum('fundingAmountSought'),
      fundingUse: get('fundingUse'),
      stage: get('stage') as ProjectCreateInput['stage'],
      legalStatus: get('legalStatus') as ProjectCreateInput['legalStatus'],
      country: get('country'),
      teamSize: getNum('teamSize'),
      website: get('website'),
      impactDescription: get('impactDescription'),
      traction: get('traction'),
      registrationNumber: get('registrationNumber'),
    };
    if (mode === 'edit') {
      data.status = get('status') as 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
    }
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h3>{mode === 'create' ? 'New venture' : 'Edit venture'}</h3>

      <section className={styles.section}>
        <h4>Basic info</h4>
        <div className={styles.field}>
          <label>Sector *</label>
          <select name="sectorId" required defaultValue={venture?.sectorId || sectors[0]?.id}>
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label>Venture name *</label>
          <input name="title" required maxLength={200} defaultValue={venture?.title} placeholder="Your venture name" />
        </div>
        <div className={styles.field}>
          <label>Description</label>
          <textarea name="description" rows={3} maxLength={5000} defaultValue={venture?.description ?? ''} placeholder="Brief overview of your venture..." />
        </div>
        {mode === 'edit' && (
          <div className={styles.field}>
            <label>Status</label>
            <select name="status" defaultValue={venture?.status}>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h4>Problem & market (fundability)</h4>
        <div className={styles.field}>
          <label>Problem statement</label>
          <textarea name="problemStatement" rows={3} maxLength={2000} defaultValue={venture?.problemStatement ?? ''} placeholder="What problem does your venture solve?" />
        </div>
        <div className={styles.field}>
          <label>Target market</label>
          <textarea name="targetMarket" rows={2} maxLength={2000} defaultValue={venture?.targetMarket ?? ''} placeholder="Who are your customers? (Africa focus)" />
        </div>
      </section>

      <section className={styles.section}>
        <h4>Business & funding</h4>
        <div className={styles.field}>
          <label>Business model</label>
          <textarea name="businessModel" rows={2} maxLength={2000} defaultValue={venture?.businessModel ?? ''} placeholder="How does your venture make money?" />
        </div>
        <div className={styles.row}>
          <div className={styles.field}>
            <label>Funding sought (USD)</label>
            <input type="number" name="fundingAmountSought" min={0} step={1000} defaultValue={venture?.fundingAmountSought ?? ''} placeholder="e.g. 50000" />
          </div>
          <div className={styles.field}>
            <label>Stage</label>
            <select name="stage" defaultValue={venture?.stage ?? ''}>
              <option value="">Select stage</option>
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className={styles.field}>
          <label>Use of funds</label>
          <textarea name="fundingUse" rows={2} maxLength={2000} defaultValue={venture?.fundingUse ?? ''} placeholder="How will you use the funding?" />
        </div>
      </section>

      <section className={styles.section}>
        <h4>Legal & team</h4>
        <div className={styles.row}>
          <div className={styles.field}>
            <label>Legal status</label>
            <select name="legalStatus" defaultValue={venture?.legalStatus ?? ''}>
              <option value="">Select status</option>
              {LEGAL_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label>Country of operation</label>
            <select name="country" defaultValue={venture?.country ?? ''}>
              <option value="">Select country</option>
              {AFRICAN_COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.field}>
            <label>Team size</label>
            <input type="number" name="teamSize" min={0} max={500} defaultValue={venture?.teamSize ?? ''} placeholder="0" />
          </div>
          <div className={styles.field}>
            <label>Registration number</label>
            <input name="registrationNumber" maxLength={100} defaultValue={venture?.registrationNumber ?? ''} placeholder="If registered" />
          </div>
        </div>
        <div className={styles.field}>
          <label>Website</label>
          <input type="url" name="website" defaultValue={venture?.website ?? ''} placeholder="https://..." />
        </div>
      </section>

      <section className={styles.section}>
        <h4>Impact & traction</h4>
        <div className={styles.field}>
          <label>Social/environmental impact</label>
          <textarea name="impactDescription" rows={2} maxLength={2000} defaultValue={venture?.impactDescription ?? ''} placeholder="What positive impact does your venture create?" />
        </div>
        <div className={styles.field}>
          <label>Traction & achievements</label>
          <textarea name="traction" rows={2} maxLength={2000} defaultValue={venture?.traction ?? ''} placeholder="Key metrics, milestones, customers..." />
        </div>
      </section>

      <div className={styles.actions}>
        <button type="submit" className={styles.submit} disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : mode === 'create' ? 'Create venture' : 'Save changes'}
        </button>
        <button type="button" onClick={onCancel} className={styles.cancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
