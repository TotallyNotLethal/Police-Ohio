interface ReferenceDisclaimerBannerProps {
  className?: string;
}

const DISCLAIMER_TEXT =
  'This app is a reference tool. Verify official law and current departmental policy before acting.';

export default function ReferenceDisclaimerBanner({ className = '' }: ReferenceDisclaimerBannerProps) {
  return (
    <div
      className={`rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 ${className}`.trim()}
      role="note"
      aria-label="Legal reference disclaimer"
    >
      {DISCLAIMER_TEXT}
    </div>
  );
}
