/**
 * Tiny typed publish/subscribe event bus — EVENT-DRIVEN PROGRAMMING.
 *
 * The game engine publishes events ("tick", "answered", "gameOver"...)
 * without knowing who listens. The UI, sound, score saving etc. subscribe.
 * This is the Observer pattern and keeps publishers and listeners decoupled.
 *
 * Code generated with AI assistance (Lovable), reviewed by the author.
 */

export type Listener<T> = (payload: T) => void;

export class EventBus<Events extends Record<string, unknown>> {
  private listeners: { [K in keyof Events]?: Set<Listener<Events[K]>> } = {};

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    (this.listeners[event] ??= new Set()).add(listener);
    return () => this.listeners[event]?.delete(listener); // unsubscribe
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    this.listeners[event]?.forEach((l) => l(payload));
  }

  clear(): void {
    this.listeners = {};
  }
}
