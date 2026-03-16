/**
 * Класс, реализующий паттерн Наблюдатель.
 */

type ObserverCallback<T> = (event: string, payload: T) => void;

export default class Observable {
  /** @type {Set<observerCallback>} Множество функций типа observerCallback */
  private observers = new Set<ObserverCallback<any>>();

  /**
   * Метод, позволяющий подписаться на событие
   * @param {observerCallback} observer Функция, которая будет вызвана при наступлении события
   */
  public addObserver<T>(observer: ObserverCallback<T>) {
    this.observers.add(observer);
  }

  /**
   * Метод, позволяющий отписаться от события
   * @param {observerCallback} observer Функция, которую больше не нужно вызывать при наступлении события
   */
  public removeObserver<T>(observer: ObserverCallback<T>) {
    this.observers.delete(observer);
  }

  /**
   * Метод для оповещения подписчиков о наступлении события
   * @param {*} event Тип события
   * @param {*} payload Дополнительная информация
   */
  protected notify<T>(event: string, payload: T) {
    this.observers.forEach((observer) => observer(event, payload));
  }
}

/**
 * Функция, которая будет вызвана при наступлении события
 * @callback observerCallback
 * @param {*} event Тип события
 * @param {*} [payload] Дополнительная информация
 */
