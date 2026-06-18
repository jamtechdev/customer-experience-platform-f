export function openNativeDatePicker(input: HTMLInputElement): void {
  if (input.disabled) return;
  input.focus({ preventScroll: true });
  const picker = input as HTMLInputElement & { showPicker?: () => void };
  if (typeof picker.showPicker === 'function') {
    try {
      picker.showPicker();
      return;
    } catch {
      // showPicker can throw if not triggered by user gesture in some browsers
    }
  }
}
