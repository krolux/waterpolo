import React from 'react';
import { FileText } from 'lucide-react';
import { getSignedUrl } from '../../lib/storage';

function clsx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ');
}

type StoredFile = { id: string; name: string; mime: string; size: number; path: string; uploadedBy: string; uploadedAt: string; label?: string };

async function downloadStoredFile(file: StoredFile) {
  const url = await getSignedUrl(file.path);
  window.open(url, '_blank', 'noopener,noreferrer');
}

type DocBadgeProps = {
  file: StoredFile;
  label: string;
  disabled?: boolean;
  canRemove?: boolean;
  onRemove?: () => void;
};

const DocBadge: React.FC<DocBadgeProps> = ({ file, label, disabled, canRemove, onRemove }) => (
  <div
    className={clsx(
      'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border bg-white',
      disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow'
    )}
    title={label}
  >
    <FileText className="w-3.5 h-3.5" />
    <button
      onClick={() => {
        if (disabled) {
          alert('Pobieranie dostępne po zalogowaniu (nie dla Gościa).');
          return;
        }
        downloadStoredFile(file);
      }}
      className={clsx(!disabled && 'hover:underline')}
    >
      {label}
    </button>
    {canRemove && (
      <button
        onClick={onRemove}
        className="ml-1 rounded px-1 leading-none hover:bg-red-100 text-red-600"
        title="Usuń dokument"
      >
        ×
      </button>
    )}
  </div>
);

export { DocBadge };
export type { StoredFile };
