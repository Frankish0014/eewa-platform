/**
 * Profile edit form — same pattern as VentureForm (sections, submit/cancel).
 */
import type { Profile } from '../api/client';
import styles from './VentureForm.module.css';

export type ProfileUpdateInput = {
  firstName: string;
  lastName: string;
};

interface ProfileFormProps {
  profile: Profile;
  onSubmit: (data: ProfileUpdateInput) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function ProfileForm({
  profile,
  onSubmit,
  onCancel,
  isSubmitting,
}: ProfileFormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const get = (name: string) =>
      (form.elements.namedItem(name) as HTMLInputElement | null)?.value?.trim() ?? '';
    const firstName = get('firstName');
    const lastName = get('lastName');
    if (!firstName || !lastName) return;
    onSubmit({ firstName, lastName });
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h3>Edit profile</h3>

      <section className={styles.section}>
        <h4>Account (read-only)</h4>
        <div className={styles.field}>
          <label>Email</label>
          <input type="email" value={profile.email} readOnly disabled aria-readonly />
        </div>
        <div className={styles.field}>
          <label>Role</label>
          <input type="text" value={profile.role} readOnly disabled aria-readonly />
        </div>
      </section>

      <section className={styles.section}>
        <h4>Your name</h4>
        <div className={styles.field}>
          <label>First name *</label>
          <input
            name="firstName"
            type="text"
            required
            maxLength={100}
            defaultValue={profile.firstName}
            placeholder="First name"
            autoComplete="given-name"
          />
        </div>
        <div className={styles.field}>
          <label>Last name *</label>
          <input
            name="lastName"
            type="text"
            required
            maxLength={100}
            defaultValue={profile.lastName}
            placeholder="Last name"
            autoComplete="family-name"
          />
        </div>
      </section>

      <div className={styles.actions}>
        <button type="submit" className={styles.submit} disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" onClick={onCancel} className={styles.cancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
