import { usePreferredReducedMotion } from '@vueuse/core';
import { computed, onScopeDispose, ref, watch, type Ref } from 'vue';

// Typewriter reveal. The whole text is laid out from the start and the
// characters are made visible one by one, so line breaks never move while
// a word is being "typed". Restarts when the text changes (language switch).
// People who prefer reduced motion get the whole text at once.
export function useTypewriter(text: Ref<string>, msPerChar = 70) {
  const chars = computed(() => Array.from(text.value));
  const visible = ref(0);
  const typing = ref(false);
  const reducedMotion = usePreferredReducedMotion();
  let timer: ReturnType<typeof setTimeout> | undefined;

  function stop() {
    clearTimeout(timer);
    typing.value = false;
  }

  function start() {
    stop();
    if (reducedMotion.value === 'reduce') {
      visible.value = chars.value.length;
      return;
    }
    visible.value = 0;
    typing.value = true;
    const step = () => {
      if (visible.value >= chars.value.length) {
        typing.value = false;
        return;
      }
      visible.value += 1;
      timer = setTimeout(step, msPerChar);
    };
    timer = setTimeout(step, msPerChar);
  }

  watch([text, reducedMotion], start, { immediate: true });
  onScopeDispose(stop);

  return { chars, visible, typing };
}
