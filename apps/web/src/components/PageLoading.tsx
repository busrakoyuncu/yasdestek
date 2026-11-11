import { FireflySpinner } from './FireflySpinner';

// What a signed-in screen shows while the session answer is on its way, and
// later while an area's code chunk downloads. The night background is there
// from the first frame; the fireflies appear only if the wait is noticeable.
export function PageLoading() {
  return (
    <main className="dark grid min-h-svh place-content-center bg-background">
      <FireflySpinner className="animate-in fade-in fill-mode-both delay-300 duration-500" />
    </main>
  );
}
