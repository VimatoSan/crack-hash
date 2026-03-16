import {randomUUID} from "crypto";
import {Queue} from "queue-typed";
import Observable from "../observable";

type TaskStatus = 'READY' | 'IN_PROGRESS' | 'PARTIALLY_COMPLETED' |'ERROR';

const TIMEOUT_MS = 10_000;

export type Task = {
  request: CrackRequest;
  status: TaskStatus;
  data: string[] | null;
  timer: NodeJS.Timeout | null;
  workerStatuses: boolean[];
}

export enum NotifyEvents {
  Start= 'START',
  Terminate = 'TERMINATE'
}

export type CrackRequest = {
  hash: string;
  maxLength: number;
}

export type RequestPayload = {
  id: string;
  hash: string;
  maxLength: number;
}

const MAX_CACHE_SIZE = 100;

export default class TasksModel extends Observable {
  private workerCount: number;
  private tasks: Record<string, Task> = {};
  private queue: Queue<string> = new Queue<string>();
  private cachedTasks: Queue<string> = new Queue<string>();

  constructor(workerCount: number) {
    super();
    this.workerCount = workerCount;
  }

  public getTask(taskId : string): Task | undefined {
    return this.tasks[taskId] || undefined;
  }

  public updateTask(taskId : string, workerIdx: number, words: string[] | string | undefined): void {
    const task = this.tasks[taskId];
    if (!task) {
      throw new Error('Task not exist');
    }

    task.workerStatuses[workerIdx] = true;
    const wordsArray = Array.isArray(words) ? words : (words ? [words] : []);
    if (wordsArray.length > 0) {
      if (!task.data) {
        task.data = wordsArray;
      } else {
        task.data.push(...wordsArray);
      }
    }

    if (task.workerStatuses.every((elem) => elem) && task.status === 'IN_PROGRESS') {
      task.status = 'READY';
      clearTimeout(task.timer!);
      this.skipTask();
    }
  }

  public addTask(request: CrackRequest): string {
    const cashedTaskId = this.findInCache(request);
    if (cashedTaskId) {
      return cashedTaskId;
    }
    const requestId = randomUUID();
    this.tasks[requestId] = {
      request,
      status: 'IN_PROGRESS',
      data: null,
      timer: null,
      workerStatuses: new Array(this.workerCount).fill(false)
    };
    this.addToCache(requestId);

    if (this.queue.isEmpty()) {
      this.startTask({
        ...request,
        id: requestId
      });
    }
    this.queue.push(requestId);
    return requestId;
  }

  private findInCache(request: CrackRequest) {
    for (const taskId of this.cachedTasks) {
      const task = this.tasks[taskId];
      if (task && task.request.hash === request.hash && task.request.maxLength === request.maxLength) {
        return taskId;
      }
    }
    return null;
  }

  private addToCache(taskId: string) {
    if (this.cachedTasks.length > MAX_CACHE_SIZE) {
      this.cachedTasks.shift();
    }
    this.cachedTasks.push(taskId);
  }

  private skipTask = () => {
    const oldTaskId = this.queue.shift();
    const oldTask = oldTaskId && this.tasks[oldTaskId];
    if (oldTask && oldTask.status === 'IN_PROGRESS') {
      this.notify<RequestPayload>(NotifyEvents.Terminate, {
        hash: oldTask.request.hash,
        maxLength: oldTask.request.maxLength,
        id: oldTaskId,
      })
      if (oldTask.data != null && oldTask.data.length > 0) {
        oldTask.status = 'PARTIALLY_COMPLETED'
      }
      else {
        oldTask.status = 'ERROR';
      }
    }

    if (!this.queue.isEmpty()) {
      const curTaskId = this.queue.first!;
      const curTask = this.tasks[curTaskId]!;
      this.startTask({
        hash: curTask.request.hash,
        maxLength: curTask.request.maxLength,
        id: curTaskId
      });
    }
  }

  private startTask(payload: RequestPayload) {
    const task = this.tasks[payload.id]!;
    task.timer = setTimeout(this.skipTask, TIMEOUT_MS);
    this.notify<RequestPayload>(NotifyEvents.Start, {
      hash: payload.hash,
      maxLength: payload.maxLength,
      id: payload.id,
    })
  }
}
