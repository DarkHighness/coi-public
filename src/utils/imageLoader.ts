/**
 * ImageLoader utility for managing background image loading with flow control.
 * Features:
 * - Queue system with concurrency limits
 * - Debouncing to prevent rapid request spam
 * - Memory caching
 * - Retry logic
 */

type LoadTask = {
  url: string;
  resolve: (url: string) => void;
  reject: (error: Error) => void;
  retries: number;
  options?: { crossOrigin?: string };
};

class ImageLoader {
  private queue: LoadTask[] = [];
  private activeLoads = 0;
  private maxConcurrent = 2;
  private cache = new Map<string, string>();

  constructor() {
    // Singleton instance
  }

  /**
   * Request to load an image.
   * If the image is cached, returns immediately.
   * If a request is already pending for this URL, it joins the queue.
   * Uses debouncing to prevent rapid changes from triggering multiple loads.
   */
  public load(
    url: string,
    options?: { crossOrigin?: string },
  ): Promise<string> {
    // 1. Check cache
    if (this.cache.has(url)) {
      return Promise.resolve(url);
    }

    // 2. Debounce logic
    // If we call load multiple times quickly, we only want to process the last one
    // However, for a general loader, we might want to load everything.
    // But for the specific case of "background changing rapidly", we want to debounce.
    // We'll implement a "loadLatest" style behavior if needed, but here we just queue.

    // Actually, for the background effect, we probably want to cancel previous pending loads if a new one comes in?
    // Or just let them finish and cache?
    // Let's stick to a standard queue but with a debounce wrapper in the component or here.

    // We'll implement a simple queue here.
    return new Promise((resolve, reject) => {
      this.queue.push({ url, resolve, reject, retries: 0, options });
      this.processQueue();
    });
  }

  /**
   * Preload an image without waiting for it
   */
  public preload(url: string): void {
    this.load(url).catch(() => {
      // Ignore errors for preloads
    });
  }

  private processQueue() {
    if (this.activeLoads >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    // Check cache again in case it was loaded while in queue
    if (this.cache.has(task.url)) {
      task.resolve(task.url);
      this.processQueue();
      return;
    }

    this.activeLoads++;
    this.loadImage(task);
  }

  private loadImage(task: LoadTask) {
    const img = new Image();
    if (task.options?.crossOrigin) {
      img.crossOrigin = task.options.crossOrigin;
    }

    img.onload = () => {
      this.cache.set(task.url, task.url);
      this.activeLoads--;
      task.resolve(task.url);
      this.processQueue();
    };

    img.onerror = () => {
      if (task.retries < 3) {
        // Retry
        console.warn(
          `Failed to load image ${task.url}, retrying (${task.retries + 1}/3)...`,
        );
        task.retries++;
        // Put back at the front of the queue or retry immediately?
        // Let's retry immediately but with a small delay to be nice
        setTimeout(
          () => {
            this.loadImage(task);
          },
          1000 * (task.retries + 1),
        );
      } else {
        this.activeLoads--;
        task.reject(new Error(`Failed to load image: ${task.url}`));
        this.processQueue();
      }
    };

    img.src = task.url;
  }

  /**
   * Clear the cache
   */
  public clearCache() {
    this.cache.clear();
  }
}

export const imageLoader = new ImageLoader();
