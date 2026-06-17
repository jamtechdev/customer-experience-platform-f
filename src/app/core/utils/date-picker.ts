export function openNativeDatePicker(input: HTMLInputElement): void {
  if (input.disabled) return;
  const picker = input as HTMLInputElement & { showPicker?: () => void };
  if (typeof picker.showPicker === 'function') {
    picker.showPicker();
  } else {
    input.focus();
  }
}
