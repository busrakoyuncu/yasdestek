import { act, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/render';
import { Attachments } from './Attachments';
import { useAudioRecorder } from './useAudioRecorder';
import { checkFile } from './useFiles';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    api: { ...actual.api, get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  };
});

import { api } from '@/lib/api';

// A MediaRecorder stand-in: records nothing, but walks through the same states.
class FakeRecorder {
  static isTypeSupported = () => true;
  state: 'inactive' | 'recording' = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  stream = { getTracks: () => [{ stop: vi.fn() }] };
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['x'], { type: 'audio/webm' }) });
    this.onstop?.();
  }
}

describe('useAudioRecorder', () => {
  beforeEach(() => {
    vi.stubGlobal('MediaRecorder', FakeRecorder);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue({}) },
    });
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: () => 'blob:kayit',
      revokeObjectURL: vi.fn(),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('walks from idle through recording to a blob, and back on reset', async () => {
    const { result } = renderHook(() => useAudioRecorder());
    expect(result.current.state).toBe('idle');
    await act(() => result.current.start());
    expect(result.current.state).toBe('recording');
    act(() => result.current.stop());
    expect(result.current.state).toBe('recorded');
    expect(result.current.blob?.type).toBe('audio/webm');
    expect(result.current.url).toBe('blob:kayit');
    act(() => result.current.reset());
    expect(result.current.state).toBe('idle');
    expect(result.current.blob).toBeNull();
  });

  it('reports a refused microphone', async () => {
    (
      navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>
    ).mockRejectedValueOnce(new Error('no'));
    const { result } = renderHook(() => useAudioRecorder());
    await act(() => result.current.start());
    expect(result.current.state).toBe('denied');
  });
});

describe('checkFile', () => {
  it('applies the shared size and type rules before upload', () => {
    expect(
      checkFile(new File(['x'], 'a.png', { type: 'image/png' })),
    ).toBeNull();
    expect(checkFile(new File(['x'], 'a.gif', { type: 'image/gif' }))).toBe(
      'UNSUPPORTED_FILE_TYPE',
    );
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.png', {
      type: 'image/png',
    });
    expect(checkFile(big)).toBe('FILE_TOO_LARGE');
  });
});

describe('Attachments', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset();
    vi.mocked(api.delete).mockReset();
  });

  it('uploads a picked image as a form with the module id', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      id: 'f1',
      mimeType: 'image/png',
      size: 1,
      createdAt: '',
    });
    renderApp(<Attachments moduleId="m1" files={[]} />, '/app/modules/m1');
    const input = screen.getByLabelText('Görsel ekle', { selector: 'input' });
    await userEvent.upload(
      input,
      new File(['x'], 'anne.png', { type: 'image/png' }),
    );
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    const [path, body] = vi.mocked(api.post).mock.calls[0] as [
      string,
      FormData,
    ];
    expect(path).toBe('/files');
    expect(body.get('moduleId')).toBe('m1');
    expect((body.get('file') as File).name).toBe('anne.png');
  });

  it('lists saved files and asks before removing one', async () => {
    vi.mocked(api.delete).mockResolvedValueOnce(undefined);
    renderApp(
      <Attachments
        moduleId="m1"
        files={[
          { id: 'f1', mimeType: 'audio/webm', size: 1, createdAt: '' },
          { id: 'f2', mimeType: 'image/jpeg', size: 1, createdAt: '' },
        ]}
      />,
      '/app/modules/m1',
    );
    expect(screen.getByLabelText('1. ses kaydı')).toHaveAttribute(
      'src',
      '/api/files/f1',
    );
    expect(screen.getByAltText('1. görsel')).toHaveAttribute(
      'src',
      '/api/files/f2',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Kaldır: 1. görsel' }),
    );
    expect(api.delete).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Kaldır' }));
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/files/f2'));
  });
});
