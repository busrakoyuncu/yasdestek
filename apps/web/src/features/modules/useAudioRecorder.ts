import { useCallback, useEffect, useRef, useState } from 'react';

export type RecorderState =
  'idle' | 'requesting' | 'recording' | 'recorded' | 'denied' | 'unsupported';

// The browser picks the container it can write; the api accepts both.
const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
const pickMimeType = () =>
  candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';

const supported = () =>
  typeof MediaRecorder !== 'undefined' &&
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices?.getUserMedia;

// Recording in the browser, step by step: ask for the microphone, record
// with a running clock, stop, listen back, keep or start over. The result is
// a Blob the upload sends like any file.
export function useAudioRecorder() {
  const [state, setState] = useState<RecorderState>(() =>
    supported() ? 'idle' : 'unsupported',
  );
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number | null>(null);

  const stopClock = () => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
  };

  // The microphone is released as soon as recording stops, so the browser's
  // "recording" indicator goes away with it.
  const releaseStream = () =>
    recorder.current?.stream.getTracks().forEach((track) => track.stop());

  const start = useCallback(async () => {
    if (!supported()) return setState('unsupported');
    setState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const media = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      chunks.current = [];
      media.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };
      media.onstop = () => {
        const type = media.mimeType || mimeType || 'audio/webm';
        const result = new Blob(chunks.current, { type });
        setBlob(result);
        setUrl(URL.createObjectURL(result));
        setState('recorded');
      };
      recorder.current = media;
      media.start(1000);
      setSeconds(0);
      timer.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
      setState('recording');
    } catch {
      setState('denied');
    }
  }, []);

  const stop = useCallback(() => {
    stopClock();
    const media = recorder.current;
    if (media && media.state !== 'inactive') media.stop();
    releaseStream();
  }, []);

  const reset = useCallback(() => {
    stopClock();
    releaseStream();
    recorder.current = null;
    setBlob(null);
    setUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setSeconds(0);
    setState(supported() ? 'idle' : 'unsupported');
  }, []);

  // Leaving the screen mid-recording must not leave the microphone open.
  useEffect(
    () => () => {
      stopClock();
      releaseStream();
    },
    [],
  );

  return { state, seconds, blob, url, start, stop, reset };
}
