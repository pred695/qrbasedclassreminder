import { useState } from 'react';
import clsx from 'clsx';

const COUNTRY_CODES = [
  { code: '+1', label: 'US +1', country: 'US' },
  { code: '+1', label: 'CA +1', country: 'CA' },
  { code: '+44', label: 'UK +44', country: 'GB' },
  { code: '+91', label: 'IN +91', country: 'IN' },
  { code: '+61', label: 'AU +61', country: 'AU' },
  { code: '+49', label: 'DE +49', country: 'DE' },
  { code: '+33', label: 'FR +33', country: 'FR' },
  { code: '+81', label: 'JP +81', country: 'JP' },
  { code: '+86', label: 'CN +86', country: 'CN' },
  { code: '+52', label: 'MX +52', country: 'MX' },
  { code: '+55', label: 'BR +55', country: 'BR' },
  { code: '+34', label: 'ES +34', country: 'ES' },
  { code: '+39', label: 'IT +39', country: 'IT' },
  { code: '+82', label: 'KR +82', country: 'KR' },
  { code: '+7', label: 'RU +7', country: 'RU' },
  { code: '+27', label: 'ZA +27', country: 'ZA' },
  { code: '+971', label: 'AE +971', country: 'AE' },
  { code: '+966', label: 'SA +966', country: 'SA' },
  { code: '+65', label: 'SG +65', country: 'SG' },
  { code: '+60', label: 'MY +60', country: 'MY' },
];

/**
 * Phone input with country code dropdown
 * Stores the full number (e.g., "+1234567890") as the value
 */
const PhoneInput = ({
  value = '',
  onChange,
  label,
  error,
  required,
  disabled,
  placeholder = '(123) 456-7890',
  className,
  ...props
}) => {
  // Parse country code from value or default to +1
  const parseValue = (val) => {
    if (!val) return { countryCode: '+1', number: '' };
    // Try to match country code at the start
    for (const cc of COUNTRY_CODES) {
      if (val.startsWith(cc.code)) {
        return { countryCode: cc.code, number: val.slice(cc.code.length) };
      }
    }
    // If value starts with + but doesn't match known codes, try to extract
    if (val.startsWith('+')) {
      // Try 4, 3, 2, 1 digit codes
      for (let len = 4; len >= 1; len--) {
        const prefix = val.slice(0, len + 1); // +xxx
        const match = COUNTRY_CODES.find(cc => cc.code === prefix);
        if (match) {
          return { countryCode: match.code, number: val.slice(prefix.length) };
        }
      }
    }
    return { countryCode: '+1', number: val };
  };

  const { countryCode: initialCode, number: initialNumber } = parseValue(value);
  const [countryCode, setCountryCode] = useState(initialCode);

  const handleCountryChange = (e) => {
    const newCode = e.target.value;
    setCountryCode(newCode);
    const { number } = parseValue(value);
    onChange({ target: { value: number ? `${newCode}${number}` : '' } });
  };

  const handleNumberChange = (e) => {
    const num = e.target.value.replace(/[^\d()-\s]/g, '');
    const digitsOnly = num.replace(/\D/g, '');
    onChange({ target: { value: digitsOnly ? `${countryCode}${digitsOnly}` : '' } });
  };

  const { number: displayNumber } = parseValue(value);

  // Get unique country codes for dropdown (dedup by code+country)
  const uniqueCodes = COUNTRY_CODES.filter(
    (cc, i, arr) => arr.findIndex(c => c.country === cc.country) === i
  );

  return (
    <div className="w-full">
      {label && (
        <label className="mb-2 block text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </label>
      )}
      <div className="flex gap-2">
        <select
          value={countryCode}
          onChange={handleCountryChange}
          disabled={disabled}
          className={clsx(
            'h-10 rounded-md border border-input bg-background px-2 py-2 text-sm',
            'ring-offset-background',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'w-24 shrink-0',
            error && 'border-destructive focus-visible:ring-destructive'
          )}
        >
          {uniqueCodes.map((cc) => (
            <option key={cc.country} value={cc.code}>
              {cc.label}
            </option>
          ))}
        </select>
        <input
          type="tel"
          value={displayNumber}
          onChange={handleNumberChange}
          placeholder={placeholder}
          disabled={disabled}
          inputMode="tel"
          autoComplete="tel"
          className={clsx(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
            'ring-offset-background placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'touch-manipulation',
            error && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
    </div>
  );
};

export default PhoneInput;
