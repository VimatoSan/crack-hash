import express, {Express, Request, Response} from "express";
import TasksModel, {CrackRequest, NotifyEvents, RequestPayload, Task} from "./tasks-model";
import {create} from "xmlbuilder2";
import axios from "axios";
import {parseXML} from "../utils";

type RequestWithBody<T> = Request<{}, {}, T>;
type RequestWithQuery<T> = Request<{}, {}, {}, T>;

type StatusQuery = {
  requestId?: string;
}

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

type WorkerInfo = {
  alphabet: string[],
  partNumber: number,
  partCount: number,
}

type WorkerRequest = RequestPayload & WorkerInfo;

export default class Service {
  private model: TasksModel;
  private app: Express;
  private readonly workerUrls: string[];

  constructor(model: TasksModel, workerUrls: string[]) {
    this.model = model;
    this.workerUrls = workerUrls;
    this.model.addObserver<RequestPayload>(this.sendToWorkers);
    this.app = express();
    this.app.use(express.json());
  }

  private convertToXML(request: WorkerRequest) {
    const doc = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('CrackRequest')
      .ele('RequestId').txt(request.id).up()
      .ele('PartNumber').txt(String(request.partNumber)).up()
      .ele('PartCount').txt(String(request.partCount)).up()
      .ele('Hash').txt(request.hash).up()
      .ele('MaxLength').txt(request.maxLength.toString()).up()
      .ele('Alphabet');

    request.alphabet.forEach(symbol => {
      doc.ele('symbols').txt(symbol).up();
    });

    return doc.doc().end({prettyPrint: true});
  }

  private sendToWorkers = (event: string, payload: RequestPayload): void => {
    switch (event) {
      case NotifyEvents.Terminate: {
        for (let i = 0; i < this.workerUrls.length; i++) {
          axios.delete(this.workerUrls[i] + '/internal/api/worker/hash/crack/task');
        }
        break;
      }
      case NotifyEvents.Start: {
        for (let i = 0; i < this.workerUrls.length; i++) {
          const xmlString = this.convertToXML({
            ...payload,
            alphabet: ALPHABET.split(''),
            partNumber: i + 1,
            partCount: this.workerUrls.length
          });
          axios.post(this.workerUrls[i] + '/internal/api/worker/hash/crack/task', xmlString, {
            headers: {
              'Content-Type': 'application/xml'
            }
          });
        }
        break;
      }
    }
  }

  private createTask = (req: RequestWithBody<CrackRequest>, res: Response): void => {
    const {hash, maxLength} = req.body;

    if (hash.trim() === '') {
      res.status(400).json({ error: 'invalid_request', message: 'hash must be a non-empty string' });
      return;
    }

    if (!Number.isInteger(maxLength) || maxLength <= 0) {
      res.status(400).json({ error: 'invalid_request', message: 'maxLength must be a positive integer' });
      return;
    }

    const requestId = this.model.addTask({hash, maxLength});

    res.status(200).json({ requestId });
  }

  private getTask = (req: RequestWithQuery<StatusQuery>, res: Response): void => {
    const requestId = req.query.requestId;

    if (!requestId) {
      res.status(400).json({ error: 'Missing requestId parameter' });
      return;
    }

    const task: Task | undefined = this.model.getTask(requestId);
    if (!task) {
      res.status(400).json({ error: 'This request does not exist' });
      return;
    }

    res.status(200).json({
      status: task.status,
      data: task.data,
    });
  }

  private receiveAnswer = (req: Request, res: Response) => {
    const workerResponse = parseXML(req.body).CrackHashWorkerResponse;

    const words = workerResponse.Answers?.words;
    this.model.updateTask(workerResponse.RequestId, workerResponse.PartNumber - 1, words);

    res.status(200).send('OK');
  }

  public init(): void {
    this.app.post("/api/hash/crack", this.createTask);
    this.app.get("/api/hash/status", this.getTask);
    this.app.patch("/internal/api/manager/hash/crack/request", express.text({ type: 'application/xml' }), this.receiveAnswer);

    const PORT = process.env.PORT || 3000;
    this.app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
  }
}
