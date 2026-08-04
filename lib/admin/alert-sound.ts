const ALERT_SRC = "/sounds/booking-alert.wav";

let unlockedAudio: HTMLAudioElement | null = null;

/** Unlock audio during a user gesture so later push alerts can play on iOS. */
export async function unlockBookingAlertSound() {
  if (typeof window === "undefined") return;
  try {
    if (!unlockedAudio) {
      unlockedAudio = new Audio(ALERT_SRC);
      unlockedAudio.preload = "auto";
      unlockedAudio.volume = 1;
    }
    unlockedAudio.currentTime = 0;
    await unlockedAudio.play();
    unlockedAudio.pause();
    unlockedAudio.currentTime = 0;
  } catch {
    /* Autoplay may still be blocked until a stronger gesture. */
  }
}

/** Loud DoorDash-style chirp — used when the admin PWA is open. */
export async function playBookingAlertSound() {
  if (typeof window === "undefined") return;
  try {
    const audio = unlockedAudio ?? new Audio(ALERT_SRC);
    audio.volume = 1;
    audio.currentTime = 0;
    await audio.play();
  } catch {
    /* Ignore if the OS blocked playback (locked screen / silent switch). */
  }
}
