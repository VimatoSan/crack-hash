import Observable from "../observable";
import { Worker } from "worker_threads";
import {config} from "../config";

export type WorkerRequest = {
  id: number;
  partNumber: number;
  partCount: number;
  hash: string;
  maxLength: number;
  alphabet: string[];
}

export type CrackResult = {
  id: string;
  words: string[];
  partNumber: number;
}

export default class WorkModel extends Observable {
  private worker: Worker | null = null;


  async startCrack(request: WorkerRequest) {
      this.worker = new Worker(config.worker.scriptPath, {
        workerData: request
      });

      this.worker.on("message", (msg) => {
        if (msg.type === "ready") {
          this.finishCrack({
            id: msg.id,
            words: msg.words,
            partNumber: msg.partNumber});
        }
      });
  }

  public terminate() {
    if (this.worker) {
      this.worker.terminate();
    }
  }


  private finishCrack(result: CrackResult): void {
    this.notify<CrackResult>('ready', result);
  }
}
