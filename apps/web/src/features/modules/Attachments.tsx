import { ImagePlus, Mic, Square, Trash2 } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { toastError, toastFailure, toastSuccess } from '@/lib/toast';
import { useAudioRecorder } from './useAudioRecorder';
import {
  acceptImages,
  checkFile,
  fileUrl,
  kindOf,
  useFileActions,
} from './useFiles';
import type { MediaFile } from './useMyResponse';
import type { FileKind } from '@yasdestek/shared';

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

// The recordings and images that go with a response: what is already saved,
// a recorder, and a picker. Uploads create the draft when there is none.
// The module decides which of the two may be added; saved files always show.
export function Attachments({
  moduleId,
  files,
  allowImages,
  allowAudio,
}: {
  moduleId: string;
  files: MediaFile[];
  allowImages: boolean;
  allowAudio: boolean;
}) {
  const { t } = useTranslation();
  const { upload, remove } = useFileActions(moduleId);
  const [pending, setPending] = useState<MediaFile | null>(null);
  const [uploading, setUploading] = useState<FileKind | null>(null);

  const send = (
    blob: Blob,
    name: string,
    kind: FileKind,
    onDone?: () => void,
  ) => {
    setUploading(kind);
    upload.mutate(
      { blob, name },
      {
        onSuccess: () => {
          toastSuccess(t('attachments.added'));
          onDone?.();
        },
        onError: (error) => toastError(error),
        onSettled: () => setUploading(null),
      },
    );
  };

  const onPickImages = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = '';
    for (const file of picked) {
      const refused = checkFile(file);
      if (refused) {
        toastFailure(t(`errors.${refused}`, { name: file.name }));
        continue;
      }
      send(file, file.name, 'image');
    }
  };

  const confirmRemove = () => {
    if (!pending) return;
    const file = pending;
    setPending(null);
    remove.mutate(file.id, {
      onSuccess: () => toastSuccess(t('attachments.removed')),
      onError: toastError,
    });
  };

  const audio = files.filter((f) => kindOf(f) === 'audio');
  const images = files.filter((f) => kindOf(f) === 'image');
  // The heading names only what this block can hold: what the module allows,
  // plus what was saved before a switch was turned off.
  const hasAudio = allowAudio || audio.length > 0;
  const hasImages = allowImages || images.length > 0;
  const title =
    hasAudio && hasImages ? 'title' : hasAudio ? 'titleAudio' : 'titleImages';

  return (
    <section
      aria-labelledby="attachments"
      className="flex max-w-prose flex-col gap-4"
    >
      {/* second to the writing: a quiet label, not another big heading */}
      <h2 id="attachments" className="text-sm font-medium text-text-secondary">
        {t(`attachments.${title}`)}
      </h2>

      {audio.length > 0 && (
        <ul className="flex flex-col gap-3">
          {audio.map((file, index) => (
            <li key={file.id} className="flex items-center gap-2">
              <audio
                controls
                preload="metadata"
                src={fileUrl(file.id)}
                className="min-w-0 flex-1"
                aria-label={t('attachments.recording', { n: index + 1 })}
              />
              <RemoveButton
                label={t('attachments.recording', { n: index + 1 })}
                onClick={() => setPending(file)}
              />
            </li>
          ))}
        </ul>
      )}

      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((file, index) => (
            <li key={file.id} className="relative">
              <a href={fileUrl(file.id)} target="_blank" rel="noreferrer">
                <img
                  src={fileUrl(file.id)}
                  alt={t('attachments.image', { n: index + 1 })}
                  className="aspect-square w-full rounded-2xl border border-border object-cover"
                />
              </a>
              <div className="absolute top-2 right-2">
                <RemoveButton
                  label={t('attachments.image', { n: index + 1 })}
                  onClick={() => setPending(file)}
                  onSurface
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* one row of small pills; the recorder opens below it while in use */}
      {(allowAudio || allowImages) && (
        <div className="flex flex-wrap items-center gap-3">
          {allowAudio && (
            <Recorder
              busy={uploading !== null}
              onKeep={(blob, done) =>
                send(
                  blob,
                  `kayit.${blob.type.includes('mp4') ? 'm4a' : 'webm'}`,
                  'audio',
                  done,
                )
              }
            />
          )}
          {allowImages && (
            <ImagePicker busy={uploading !== null} onPick={onPickImages} />
          )}
        </div>
      )}

      {uploading && (
        <p className="text-sm text-text-secondary" role="status">
          {t(
            uploading === 'audio'
              ? 'attachments.uploadingAudio'
              : 'attachments.uploadingImage',
          )}
        </p>
      )}

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('attachments.remove.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('attachments.remove.body')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* on a phone "Vazgeç" stacks on top, away from removing by accident */}
          <AlertDialogFooter className="flex-col">
            <AlertDialogCancel className="h-10 rounded-full px-4">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="h-10 rounded-full px-4"
              onClick={confirmRemove}
            >
              {t('attachments.remove.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function RemoveButton({
  label,
  onClick,
  onSurface,
}: {
  label: string;
  onClick: () => void;
  onSurface?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Button
      variant={onSurface ? 'secondary' : 'ghost'}
      size="icon"
      className="size-9 shrink-0 rounded-full text-destructive hover:text-destructive"
      aria-label={`${t('attachments.removeAction')}: ${label}`}
      onClick={onClick}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}

// Record, listen, keep or start over. Idle it is one pill in the row;
// recording and listening back take the full width below the row.
function Recorder({
  busy,
  onKeep,
}: {
  busy: boolean;
  onKeep: (blob: Blob, done: () => void) => void;
}) {
  const { t } = useTranslation();
  const rec = useAudioRecorder();
  const below = 'order-last w-full';

  if (rec.state === 'unsupported') {
    return (
      <p className={`${below} text-sm text-text-secondary`}>
        {t('attachments.recorder.unsupported')}
      </p>
    );
  }

  if (
    rec.state === 'idle' ||
    rec.state === 'denied' ||
    rec.state === 'requesting'
  ) {
    return (
      <>
        <Button
          variant="outline"
          className="h-11 rounded-full px-5 text-base"
          disabled={rec.state === 'requesting' || busy}
          onClick={() => void rec.start()}
        >
          <Mic className="size-5" aria-hidden="true" />
          {t(
            rec.state === 'requesting'
              ? 'attachments.recorder.requesting'
              : 'attachments.recorder.start',
          )}
        </Button>
        {rec.state === 'denied' && (
          <p className={`${below} text-sm text-destructive`} role="alert">
            {t('attachments.recorder.denied')}
          </p>
        )}
      </>
    );
  }

  return (
    <div
      className={`${below} flex flex-col gap-3 rounded-2xl border border-border p-4`}
    >
      {rec.state === 'recording' && (
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="flex items-center gap-2 text-base tabular-nums"
            role="timer"
            aria-live="off"
          >
            <span
              className="size-2.5 animate-pulse rounded-full bg-destructive"
              aria-hidden="true"
            />
            {clock(rec.seconds)}
          </span>
          <Button
            className="h-11 rounded-full px-5 text-base"
            onClick={rec.stop}
          >
            <Square className="size-4" aria-hidden="true" />
            {t('attachments.recorder.stop')}
          </Button>
        </div>
      )}
      {rec.state === 'recorded' && rec.url && rec.blob && (
        <div className="flex flex-col gap-3">
          <audio
            controls
            src={rec.url}
            className="w-full"
            aria-label={t('attachments.recorder.preview')}
          />
          <div className="flex flex-wrap gap-3">
            <Button
              className="h-11 rounded-full px-5 text-base"
              disabled={busy}
              onClick={() => onKeep(rec.blob!, rec.reset)}
            >
              {t('attachments.recorder.keep')}
            </Button>
            <Button
              variant="ghost"
              className="h-11 rounded-full px-5 text-base"
              disabled={busy}
              onClick={rec.reset}
            >
              {t('attachments.recorder.again')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ImagePicker({
  busy,
  onPick,
}: {
  busy: boolean;
  onPick: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept={acceptImages}
        multiple
        className="sr-only"
        aria-label={t('attachments.addImage')}
        onChange={onPick}
      />
      <Button
        variant="outline"
        className="h-11 rounded-full px-5 text-base"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        <ImagePlus className="size-5" aria-hidden="true" />
        {t('attachments.addImage')}
      </Button>
    </>
  );
}
