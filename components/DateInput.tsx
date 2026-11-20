import type {ChangeEventHandler, InputHTMLAttributes} from 'react';
import {CalendarDays} from 'lucide-react';

type DateInputProps = Pick<InputHTMLAttributes<HTMLInputElement>, 'id' | 'name' | 'min' | 'max' | 'disabled' | 'required'> & {
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  ariaLabel?: string;
};

/** A Safari-safe date control. Keep the native picker for input/accessibility,
 * but render the visible date and icon ourselves to avoid iOS intrinsic-width
 * overflow and abrupt clipping. The actual input remains focusable/clickable.
 */
function displayDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return 'Choose a date';
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return 'Choose a date';
  }
  return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
}

export default function DateInput({value, onChange, ariaLabel, ...other}: DateInputProps) {
  return (
    <span className="date-control">
      <span className="date-control-value" aria-hidden="true">{displayDate(value)}</span>
      <CalendarDays className="date-control-icon" size={18} aria-hidden="true" />
      <input
        {...other}
        className="date-control-native"
        type="date"
        value={value}
        onChange={onChange}
        aria-label={ariaLabel}
      />
    </span>
  );
}
